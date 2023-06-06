import {
  MessageDataModelError,
  MessageSyntaxError,
  MissingCharError
} from '../errors.js';
import type {
  CatchallKeyParsed,
  DeclarationParsed,
  LiteralParsed,
  MessageParsed,
  NmtokenParsed,
  PatternParsed,
  PatternMessageParsed,
  PlaceholderParsed,
  SelectMessageParsed,
  TextParsed,
  VariantParsed
} from './data-model.js';
import { parseDeclarations } from './declarations.js';
import { parseNmtoken } from './names.js';
import { parsePlaceholder } from './placeholder.js';
import { whitespaces } from './util.js';
import { parseLiteral, parseText } from './values.js';

export class ParseContext {
  readonly errors: MessageSyntaxError[] = [];
  readonly resource: boolean;
  readonly source: string;

  constructor(source: string, opt?: { resource?: boolean }) {
    this.resource = opt?.resource ?? false;
    this.source = source;
  }

  onError(
    type: Exclude<typeof MessageSyntaxError.prototype.type, 'missing-char'>,
    start: number,
    end: number
  ): void;
  onError(type: 'missing-char', start: number, char: string): void;
  onError(
    type: typeof MessageSyntaxError.prototype.type,
    start: number,
    end: number | string
  ) {
    let err: MessageSyntaxError;
    switch (type) {
      case 'key-mismatch':
      case 'missing-fallback':
        err = new MessageDataModelError(type, start, Number(end));
        break;
      case 'missing-char':
        err = new MissingCharError(start, String(end));
        break;
      default:
        err = new MessageSyntaxError(type, start, Number(end));
    }
    this.errors.push(err);
  }
}

// Message ::= Declaration* ( Pattern | Selector Variant+ )
// Selector ::= 'match' ( '{' Expression '}' )+
/**
 * Parse the string syntax representation of a message into
 * its corresponding data model representation.
 *
 * @beta
 */
export function parseMessage(
  source: string,
  opt?: { resource?: boolean }
): MessageParsed {
  const ctx = new ParseContext(source, opt);
  const { declarations, end: pos } = parseDeclarations(ctx);

  if (source.startsWith('match', pos)) {
    return parseSelectMessage(ctx, pos, declarations);
  } else if (source[pos] === '{') {
    return parsePatternMessage(ctx, pos, declarations);
  } else {
    ctx.onError('parse-error', pos, source.length);
    return { type: 'junk', declarations, errors: ctx.errors, source };
  }
}

function parsePatternMessage(
  ctx: ParseContext,
  start: number,
  declarations: DeclarationParsed[]
): PatternMessageParsed {
  const pattern = parsePattern(ctx, start);
  let pos = pattern.end;
  pos += whitespaces(ctx.source, pos);

  if (pos < ctx.source.length) {
    ctx.onError('extra-content', pos, ctx.source.length);
  }

  return { type: 'message', declarations, pattern, errors: ctx.errors };
}

function parseSelectMessage(
  ctx: ParseContext,
  start: number,
  declarations: DeclarationParsed[]
): SelectMessageParsed {
  let pos = start + 5; // 'match'
  pos += whitespaces(ctx.source, pos);

  const selectors: PlaceholderParsed[] = [];
  while (ctx.source[pos] === '{') {
    const ph = parsePlaceholder(ctx, pos);
    switch (ph.body.type) {
      case 'expression':
      case 'literal':
      case 'variable':
        break;
      default: {
        const { start, end } = ph.body;
        ctx.onError('bad-selector', start, end);
      }
    }
    selectors.push(ph);
    pos = ph.end;
    pos += whitespaces(ctx.source, pos);
  }
  if (selectors.length === 0) {
    ctx.onError('empty-token', pos, pos + 1);
  }

  const variants: VariantParsed[] = [];
  pos += whitespaces(ctx.source, pos);
  while (ctx.source.startsWith('when', pos)) {
    const variant = parseVariant(ctx, pos, selectors.length);
    variants.push(variant);
    pos = variant.end;
    pos += whitespaces(ctx.source, pos);
  }

  if (pos < ctx.source.length) {
    ctx.onError('extra-content', pos, ctx.source.length);
  }

  return {
    type: 'select',
    declarations,
    selectors,
    variants,
    errors: ctx.errors
  };
}

// Variant ::= 'when' ( WhiteSpace VariantKey )+ Pattern
// VariantKey ::= Literal | Nmtoken | '*'
function parseVariant(
  ctx: ParseContext,
  start: number,
  selCount: number
): VariantParsed {
  let pos = start + 4; // 'when'
  const keys: Array<LiteralParsed | NmtokenParsed | CatchallKeyParsed> = [];
  while (pos < ctx.source.length) {
    const ws = whitespaces(ctx.source, pos);
    pos += ws;
    const ch = ctx.source[pos];
    if (ch === '{') break;

    if (ws === 0) ctx.onError('missing-char', pos, ' ');

    let key: CatchallKeyParsed | LiteralParsed | NmtokenParsed;
    switch (ch) {
      case '*':
        key = { type: '*', start: pos, end: pos + 1 };
        break;
      case '|':
        key = parseLiteral(ctx, pos);
        break;
      default:
        key = parseNmtoken(ctx, pos);
    }
    if (key.end === pos) break; // error; reported in pattern.errors
    keys.push(key);
    pos = key.end;
  }

  if (selCount > 0 && keys.length !== selCount) {
    const end = keys.length === 0 ? pos : keys[keys.length - 1].end;
    ctx.onError('key-mismatch', start, end);
  }

  const value = parsePattern(ctx, pos);
  return { start, end: value.end, keys, value };
}

// Pattern ::= '{' (Text | Placeholder)* '}' /* ws: explicit */
function parsePattern(ctx: ParseContext, start: number): PatternParsed {
  if (ctx.source[start] !== '{') {
    ctx.onError('missing-char', start, '{');
    return { start, end: start, body: [] };
  }

  let pos = start + 1;
  const body: Array<TextParsed | PlaceholderParsed> = [];
  loop: while (pos < ctx.source.length) {
    switch (ctx.source[pos]) {
      case '{': {
        const ph = parsePlaceholder(ctx, pos);
        body.push(ph);
        pos = ph.end;
        break;
      }
      case '}':
        break loop;
      default: {
        const tx = parseText(ctx, pos);
        body.push(tx);
        pos = tx.end;
      }
    }
  }

  if (ctx.source[pos] === '}') pos += 1;
  else ctx.onError('missing-char', pos, '}');

  return { start, end: pos, body };
}
