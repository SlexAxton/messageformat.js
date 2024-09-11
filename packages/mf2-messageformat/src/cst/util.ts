const whitespaceChars = new Set(['\t', '\n', '\r', ' ', '\u3000']);

export function whitespaces(src: string, start: number): number {
  let length = 0;
  let ch = src[start];
  while (whitespaceChars.has(ch)) {
    length += 1;
    ch = src[start + length];
  }
  return length;
}
