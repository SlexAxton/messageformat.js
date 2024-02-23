import type * as MF from 'messageformat';
import type * as X from './xliff-spec';
import { parse } from './xliff';
import { fromNmtoken } from './nmtoken';

export type ParsedUnit = {
  /** The same `file` object is used for all units in the same file. */
  file: { id: string; srcLang: string; trgLang?: string };
  key: string[];
  source: MF.Message;
  target?: MF.Message;
};

// TODO: Support declarations
export function* xliff2mf(
  xliff: string | X.Xliff | X.XliffDoc
): Generator<ParsedUnit, void> {
  if (typeof xliff === 'string') xliff = parse(xliff);
  if (xliff.name !== 'xliff') xliff = xliff.elements[0];
  const { srcLang, trgLang } = xliff.attributes;
  for (const file of xliff.elements) {
    const id = parseId('f', file.attributes.id).key.join('.');
    const fileInfo = { id, srcLang, trgLang };
    for (const el of file.elements) {
      yield* resolveEntry(fileInfo, el);
    }
  }
}

function* resolveEntry(
  file: ParsedUnit['file'],
  entry: X.File['elements'][number] | Required<X.Group>['elements'][number]
): Generator<ParsedUnit, void> {
  if (entry.elements) {
    switch (entry.name) {
      case 'group': {
        for (const el of entry.elements) yield* resolveEntry(file, el);
        break;
      }
      case 'unit': {
        const { key } = parseId('u', entry.attributes.id);
        const rd = entry.elements.find(el => el.name === 'res:resourceData') as
          | X.ResourceData
          | undefined;
        const { source, target } = entry.attributes['mf:select']
          ? resolveSelectMessage(rd, entry)
          : resolvePatternMessage(rd, entry);
        yield { file, key, source, target };
        break;
      }
    }
  }
}

function parseId(
  pre: 's',
  id: string | undefined
): { key: string[]; variant: MF.Variant['keys'] };
function parseId(
  pre: 'f' | 'g' | 'u',
  id: string | undefined
): { key: string[] };
function parseId(
  pre: 'f' | 'g' | 's' | 'u',
  id: string | undefined
): { key: string[]; variant?: MF.Variant['keys'] } {
  const match = id?.match(/(?:_[_:]|[^:])+/g);
  if (match && match.length >= 2 && match[0] === pre) {
    const keyMatch = match[1].match(/(?:_[_.]|[^.])+/g);
    const variantMatch = match[2]?.match(/(?:_[_.]|[^.])+/g);
    if (keyMatch && (pre !== 's' || variantMatch)) {
      return {
        key: keyMatch.map(fromNmtoken),
        variant: variantMatch?.map(v =>
          v === '_other'
            ? { type: '*' }
            : { type: 'literal', quoted: false, value: fromNmtoken(v) }
        )
      };
    }
  }
  const el = { f: 'file', g: 'group', s: 'segment', u: 'unit' }[pre];
  const pe = prettyElement(el, id);
  throw new Error(`Invalid id attribute for ${pe}`);
}

const prettyElement = (name: string, id: string | undefined) =>
  id ? `<${name} id=${JSON.stringify(id)}>` : `<${name}>`;

function resolveSelectMessage(
  rd: X.ResourceData | undefined,
  { attributes, elements }: X.Unit
): { source: MF.SelectMessage; target?: MF.SelectMessage } {
  if (!rd) {
    const el = prettyElement('unit', attributes.id);
    throw new Error(`<res:resourceData> not found in ${el}`);
  }
  const source: MF.SelectMessage = {
    type: 'select',
    declarations: [],
    selectors: [],
    variants: []
  };
  const target: MF.SelectMessage = {
    type: 'select',
    declarations: [],
    selectors: [],
    variants: []
  };
  for (const el of elements!) {
    if (el.name === 'segment') {
      const keys = parseId('s', el.attributes?.id).variant;
      const pattern = resolvePattern(rd, el);
      source.variants.push({ keys, value: pattern.source });
      if (pattern.target) target.variants.push({ keys, value: pattern.target });
    }
  }
  if (!source.variants.length) {
    const el = prettyElement('unit', attributes.id);
    throw new Error(`No variant <segment> elements found in ${el}`);
  }
  const hasTarget = !!target.variants.length;
  for (const ref of attributes['mf:select']!.trim().split(/\s+/)) {
    const srcElements = getMessageElements('source', rd!, ref);
    source.selectors.push(resolveExpression(srcElements));
    if (hasTarget) {
      const tgtElements = getMessageElements('target', rd!, ref);
      target.selectors.push(resolveExpression(tgtElements));
    }
  }
  return { source, target: hasTarget ? target : undefined };
}

function resolvePatternMessage(
  rd: X.ResourceData | undefined,
  { elements }: X.Unit
): { source: MF.PatternMessage; target?: MF.PatternMessage } {
  const source: MF.Pattern = [];
  const target: MF.Pattern = [];
  let hasTarget = false;
  if (elements) {
    for (const el of elements) {
      switch (el.name) {
        case 'segment':
        case 'ignorable': {
          const pattern = resolvePattern(rd, el);
          source.push(...pattern.source);
          if (pattern.target) {
            target.push(...pattern.target);
            hasTarget = true;
          }
          break;
        }
      }
    }
  }
  return {
    source: { type: 'message', declarations: [], pattern: source },
    target: hasTarget
      ? { type: 'message', declarations: [], pattern: target }
      : undefined
  };
}

function resolvePattern(
  rd: X.ResourceData | undefined,
  { name, attributes, elements }: X.Segment | X.Ignorable
): { source: MF.Pattern; target?: MF.Pattern } {
  let source: MF.Pattern | undefined;
  let target: MF.Pattern | undefined;
  for (const el of elements) {
    switch (el.name) {
      case 'source':
        source = resolvePatternElements('source', rd, el.elements);
        break;
      case 'target':
        target = resolvePatternElements('target', rd, el.elements);
        break;
    }
  }
  if (!source) {
    const pe = prettyElement(name, attributes?.id);
    throw new Error(`Expected to find a <source> inside ${pe}`);
  }
  return { source, target };
}

function resolvePatternElements(
  st: 'source' | 'target',
  rd: X.ResourceData | undefined,
  elements: (X.Text | X.InlineElement)[]
): MF.Pattern {
  const pattern: MF.Pattern = [];
  for (const ie of elements) {
    const last = pattern.at(-1);
    const next = resolveInlineElement(st, rd, ie);
    if (typeof next === 'string') {
      if (typeof last === 'string') pattern[pattern.length - 1] += next;
      else pattern.push(next);
    } else {
      pattern.push(...next);
    }
  }
  return pattern;
}

function resolveInlineElement(
  st: 'source' | 'target',
  rd: X.ResourceData | undefined,
  ie: X.Text | X.InlineElement
): string | Array<string | MF.Expression | MF.Markup> {
  switch (ie.type) {
    case 'text':
    case 'cdata':
      return ie.text;
    case 'element':
      switch (ie.name) {
        case 'cp':
          return resolveCharCode(ie);
        case 'ph':
        case 'sc':
        case 'ec':
          return [resolvePlaceholder(st, rd, ie)];
        case 'pc': {
          const open = resolvePlaceholder(st, rd, ie);
          return [
            open,
            ...resolvePatternElements(st, rd, ie.elements),
            { type: 'markup', kind: 'close', name: open.name }
          ];
        }
      }
  }
  throw new Error(`Unsupported inline ${ie.type} <${ie.name}>`);
}

function resolvePlaceholder(
  st: 'source' | 'target',
  rd: X.ResourceData | undefined,
  el: X.CodeSpan | X.CodeSpanStart | X.CodeSpanEnd
): MF.Markup;
function resolvePlaceholder(
  st: 'source' | 'target',
  rd: X.ResourceData | undefined,
  el: X.Placeholder | X.CodeSpan | X.CodeSpanStart | X.CodeSpanEnd
): MF.Expression | MF.Markup;
function resolvePlaceholder(
  st: 'source' | 'target',
  rd: X.ResourceData | undefined,
  el: X.Placeholder | X.CodeSpan | X.CodeSpanStart | X.CodeSpanEnd
): MF.Expression | MF.Markup {
  const { name } = el;
  const ref = el.attributes?.['mf:ref'];
  if (!ref) throw new Error(`Unsupported <${name}> without mf:ref attribute`);
  if (!rd) {
    const el = `<${name} mf:ref=${JSON.stringify(ref)}>`;
    throw new Error(
      `Resolving ${el} requires <res:resourceData> in the same <unit>`
    );
  }
  const mfElements = getMessageElements(st, rd, String(ref));
  if (mfElements[0].name === 'mf:markup') {
    const kind =
      name === 'ph' ? 'standalone' : name === 'ec' ? 'close' : 'open';
    return resolveMarkup(mfElements[0], kind);
  }
  if (name !== 'ph') {
    throw new Error('Only <ph> elements may refer to expression values');
  }
  return resolveExpression(mfElements);
}

function getMessageElements(
  st: 'source' | 'target',
  rd: X.ResourceData,
  ref: string
) {
  const ri = rd.elements.find(el => el.attributes?.id === ref);
  if (ri?.elements) {
    const parent =
      (st === 'target'
        ? ri.elements.find(el => el.name === 'res:target')
        : null) ?? ri.elements.find(el => el.name === 'res:source');
    const mfElements = parent?.elements?.filter(
      el => el.type === 'element' && el.name.startsWith('mf:')
    );
    if (mfElements?.length) return mfElements as X.MessageElements;
  }
  throw new Error(`Unresolved MessageFormat reference: ${ref}`);
}

function resolveExpression(elements: X.MessageElements): MF.Expression {
  let xArg: X.MessageLiteral | X.MessageVariable | undefined;
  let xFunc: X.MessageFunction | X.MessageUnsupported | undefined;
  const attributes: MF.Attribute[] = [];
  for (const el of elements) {
    switch (el.name) {
      case 'mf:literal':
      case 'mf:variable':
        if (xArg) throw new Error('More than one value in an expression');
        xArg = el;
        break;
      case 'mf:function':
      case 'mf:unsupported':
        if (xFunc) throw new Error('More than one annotation in an expression');
        xFunc = el;
        break;
      case 'mf:markup':
        throw new Error('Cannot reference markup as expression');
      case 'mf:attribute': {
        const value = el.elements?.find(el => el.type === 'element');
        attributes.push({
          name: el.attributes.name,
          value: value ? resolveValue(value) : undefined
        });
        break;
      }
    }
  }

  const arg = xArg ? resolveValue(xArg) : undefined;
  if (!xFunc) {
    if (!arg) throw new Error('Invalid empty expression');
    return { type: 'expression', arg, attributes };
  }

  let annotation: MF.FunctionAnnotation | MF.UnsupportedAnnotation;
  if (xFunc.name === 'mf:function') {
    annotation = { type: 'function', name: xFunc.attributes.name };
    const optEls = xFunc.elements?.filter(el => el.type === 'element');
    if (optEls?.length) {
      annotation.options = optEls.map(el => ({
        name: el.attributes.name,
        value: resolveValue(el.elements.find(el => el.type === 'element'))
      }));
    }
  } else {
    annotation = {
      type: 'unsupported-annotation',
      source: resolveText(xFunc.elements)
    };
  }

  return arg
    ? { type: 'expression', arg, annotation, attributes }
    : { type: 'expression', annotation, attributes };
}

function resolveMarkup(
  part: X.MessageMarkup,
  kind: 'open' | 'standalone' | 'close'
) {
  const markup: MF.Markup = {
    type: 'markup',
    kind,
    name: part.attributes.name
  };
  if (kind !== 'close') {
    const optEls = part.elements?.filter(el => el.type === 'element');
    if (optEls?.length) {
      markup.options = optEls.map(el => ({
        name: el.attributes.name,
        value: resolveValue(el.elements.find(el => el.type === 'element'))
      }));
    }
  }
  return markup;
}

function resolveValue(
  part: X.MessageLiteral | X.MessageVariable | undefined
): MF.Literal | MF.VariableRef {
  switch (part?.name) {
    case 'mf:literal':
      return { type: 'literal', value: resolveText(part.elements) };
    case 'mf:variable':
      return { type: 'variable', name: part.attributes.name };
  }

  throw new Error(`Unsupported value: ${part}`);
}

const resolveText = (text: (X.Text | X.CharCode)[]) =>
  text.map(t => (t.type === 'element' ? resolveCharCode(t) : t.text)).join('');

const resolveCharCode = (cc: X.CharCode) =>
  String.fromCodePoint(Number(cc.attributes.hex));
