import type { Context } from '../format-context.js';
import type { MessageMarkupPart } from '../formatted-parts.js';
import { resolveValue } from './resolve-value.js';
import type { Markup } from './types.js';

export function formatMarkup(
  ctx: Context,
  { kind, name, options }: Markup
): MessageMarkupPart {
  const source =
    kind === 'close' ? `/${name}` : kind === 'open' ? `#${name}` : `#${name}/`;
  const part: MessageMarkupPart = { type: 'markup', kind, source, name };
  if (options?.length) {
    part.options = {};
    for (const { name, value } of options) {
      let rv = resolveValue(ctx, value);
      if (typeof rv === 'object' && typeof rv?.valueOf === 'function') {
        const vv = rv.valueOf();
        if (vv !== rv) rv = vv;
      }
      part.options[name] = rv;
    }
  }
  return part;
}
