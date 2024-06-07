import { MessageError } from '../errors.js';
import type { Context } from '../format-context.js';
import { fallback } from '../functions/fallback.js';
import { MessageFunctionContext } from './function-context.js';
import { getValueSource, resolveValue } from './resolve-value.js';
import type {
  FunctionAnnotation,
  Literal,
  Option,
  VariableRef
} from './types.js';

export function resolveFunctionAnnotation(
  ctx: Context,
  operand: Literal | VariableRef | undefined,
  { name, options }: FunctionAnnotation
) {
  let source: string | undefined;
  try {
    let fnInput: [unknown] | [];
    if (operand) {
      fnInput = [resolveValue(ctx, operand)];
      source = getValueSource(operand);
    } else {
      fnInput = [];
    }
    source ??= `:${name}`;

    const rf = ctx.functions[name];
    if (!rf) {
      throw new MessageError('missing-func', `Unknown function :${name}`);
    }
    const msgCtx = new MessageFunctionContext(ctx, source);
    const opt = resolveOptions(ctx, options);
    const res = rf(msgCtx, opt, ...fnInput);
    if (
      !(res instanceof Object) ||
      typeof res.type !== 'string' ||
      typeof res.source !== 'string'
    ) {
      throw new MessageError(
        'bad-function-result',
        `Function :${name} did not return a MessageValue`
      );
    }
    return res;
  } catch (error) {
    ctx.onError(error);
    source ??= getValueSource(operand) ?? `:${name}`;
    return fallback(source);
  }
}

function resolveOptions(ctx: Context, options: Option[] | undefined) {
  const opt: Record<string, unknown> = Object.create(null);
  if (options) {
    for (const { name, value } of options) {
      opt[name] = resolveValue(ctx, value);
    }
  }
  return opt;
}
