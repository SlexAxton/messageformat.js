import type {
  LiteralParsed,
  TextParsed,
  VariableRefParsed
} from './data-model.js';
import type { ParseContext } from './message.js';
import { parseNameValue } from './names.js';

// Text ::= (TextChar | TextEscape)+
// TextChar ::= AnyChar - ('{' | '}' | Esc)
// AnyChar ::= [#x0-#x10FFFF]
// Esc ::= '\'
// TextEscape ::= Esc Esc | Esc '{' | Esc '}'
export function parseText(ctx: ParseContext, start: number): TextParsed {
  let value = '';
  let pos = start;
  let i = start;
  loop: for (; i < ctx.source.length; ++i) {
    switch (ctx.source[i]) {
      case '\\': {
        const esc = parseEscape(ctx, 'text', i);
        if (esc) {
          value += ctx.source.substring(pos, i) + esc.value;
          i += esc.length;
          pos = i + 1;
        }
        break;
      }
      case '{':
      case '}':
        break loop;
      case '\n':
        if (ctx.resource) {
          const nl = i;
          let next = ctx.source[i + 1];
          while (next === ' ' || next === '\t') {
            i += 1;
            next = ctx.source[i + 1];
          }
          if (i > nl) {
            value += ctx.source.substring(pos, nl + 1);
            pos = i + 1;
          }
        }
        break;
    }
  }
  value += ctx.source.substring(pos, i);
  return { type: 'text', start, end: i, value };
}

// Literal ::= '(' (LiteralChar | LiteralEscape)* ')' /* ws: explicit */
// Esc ::= '\'
// LiteralChar ::= AnyChar - ('|' | Esc)
// LiteralEscape ::= Esc Esc | Esc '|'
export function parseLiteral(ctx: ParseContext, start: number): LiteralParsed {
  let value = '';
  let pos = start + 1;
  for (let i = pos; i < ctx.source.length; ++i) {
    switch (ctx.source[i]) {
      case '\\': {
        const esc = parseEscape(ctx, 'literal', i);
        if (esc) {
          value += ctx.source.substring(pos, i) + esc.value;
          i += esc.length;
          pos = i + 1;
        }
        break;
      }
      case '|':
        value += ctx.source.substring(pos, i);
        return { type: 'literal', start, end: i + 1, value };
      case '\n':
        if (ctx.resource) {
          const nl = i;
          let next = ctx.source[i + 1];
          while (next === ' ' || next === '\t') {
            i += 1;
            next = ctx.source[i + 1];
          }
          if (i > nl) {
            value += ctx.source.substring(pos, nl + 1);
            pos = i + 1;
          }
        }
        break;
    }
  }
  value += ctx.source.substring(pos);
  ctx.onError('missing-char', ctx.source.length, '|');
  return { type: 'literal', start, end: ctx.source.length, value };
}

// Variable ::= '$' Name /* ws: explicit */
export function parseVariable(
  ctx: ParseContext,
  start: number
): VariableRefParsed {
  const pos = start + 1;
  const name = parseNameValue(ctx.source, pos);
  const end = pos + name.length;
  if (!name) ctx.onError('empty-token', pos, pos + 1);
  return { type: 'variable', start, end, name };
}

function parseEscape(
  ctx: ParseContext,
  scope: 'text' | 'literal',
  start: number
): { value: string; length: number } | null {
  const raw = ctx.source[start + 1];
  switch (raw) {
    case '\\':
      return { value: raw, length: 1 };
    case '{':
    case '}':
      if (scope === 'text') return { value: raw, length: 1 };
      break;
    case '|':
      if (scope === 'literal') return { value: raw, length: 1 };
      break;
    default:
      if (ctx.resource) {
        let hexLen = 0;
        switch (raw) {
          case '\t':
          case ' ':
            return { value: raw, length: 1 };
          case 'n':
            return { value: '\n', length: 1 };
          case 'r':
            return { value: '\r', length: 1 };
          case 't':
            return { value: '\t', length: 1 };
          case 'u':
            hexLen = 4;
            break;
          case 'U':
            hexLen = 6;
            break;
          case 'x':
            hexLen = 2;
            break;
        }
        if (hexLen > 0) {
          const h0 = start + 2;
          const raw = ctx.source.substring(h0, h0 + hexLen);
          if (raw.length === hexLen && /^[0-9A-Fa-f]+$/.test(raw)) {
            return {
              value: String.fromCharCode(parseInt(raw, 16)),
              length: 1 + hexLen
            };
          }
        }
      }
  }
  ctx.onError('bad-escape', start, start + 2);
  return null;
}
