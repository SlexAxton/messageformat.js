import type { Meta } from '../data-model';
import type { MessageFormatPart } from '../formatted-part';
import { Formattable, LocaleContext } from './formattable';

export class FormattableDateTime extends Formattable<
  Date,
  Intl.DateTimeFormatOptions
> {
  locales: string[] | undefined;
  options: Intl.DateTimeFormatOptions | undefined;

  constructor(
    locale: string | string[] | LocaleContext | null,
    date: Date | FormattableDateTime,
    {
      meta,
      options,
      source
    }: {
      meta?: Meta;
      options?: Intl.DateTimeFormatOptions;
      source?: string;
    } = {}
  ) {
    const fmt = { meta, source };
    if (date instanceof FormattableDateTime) {
      super(date.getLocaleContext(locale), date.value, fmt);
      if (options || date.options)
        this.options = date.options
          ? { ...date.options, ...options }
          : { ...options };
    } else {
      super(locale, date, fmt);
      if (options) this.options = { ...options };
    }
  }

  private getDateTimeFormatter() {
    const lc = this.getLocaleContext();
    const opt = lc
      ? { localeMatcher: lc.localeMatcher, ...this.options }
      : this.options;
    return new Intl.DateTimeFormat(lc?.locales, opt);
  }

  toParts(): MessageFormatPart[] {
    try {
      const res = this.initFormattedParts(true);
      const dtf = this.getDateTimeFormatter();
      const date = this.getValue();
      const source = this.getSource(false);
      for (const part of dtf.formatToParts(date) as MessageFormatPart[]) {
        part.source = source;
        res.push(part);
      }
      return res;
    } catch (_) {
      // TODO: Report error
      const value = this.toString();
      const source = this.getSource(true);
      return [{ type: 'fallback', value, source }];
    }
  }

  toString() {
    let date: Date | undefined;
    try {
      const hasOpt = this.options && Object.keys(this.options).length > 0;
      date = this.getValue();
      if (hasOpt) {
        const dtf = this.getDateTimeFormatter();
        return dtf.format(date);
      } else {
        const lm = this.options?.localeMatcher;
        const options = lm ? { localeMatcher: lm } : undefined;
        return date.toLocaleString(this.getLocaleContext()?.locales, options);
      }
    } catch (_) {
      // TODO: Report error
      return date === undefined
        ? '{' + this.getSource(true) + '}'
        : String(date);
    }
  }
}