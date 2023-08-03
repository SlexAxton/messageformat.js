import type { MessageValue } from './message-value';
import { PatternElement } from './pattern';
import { Runtime } from './runtime';

export interface Context {
  onError(error: unknown, value: MessageValue): void;
  resolve(elem: PatternElement): MessageValue;
  localeMatcher: 'best fit' | 'lookup';
  locales: string[];
  runtime: Runtime;
  /**
   * A representation of the parameters/arguments passed to a message formatter,
   * and extended by declarations.
   * Used by the Variable resolver.
   */
  scope: Record<string, unknown>;
}
