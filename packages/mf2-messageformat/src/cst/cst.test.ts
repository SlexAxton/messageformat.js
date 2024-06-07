import testCore from '~/test/messageformat-wg/test/test-core.json';
import testFunctions from '~/test/messageformat-wg/test/test-functions.json';
import { testName } from '~/test/util-test-name.js';
import { parseCST, stringifyCST } from '../index.js';

for (const [title, messages] of [
  ['Parse & stringify CST of core messages', testCore] as const,
  ...Object.entries(testFunctions).map(
    x => [`Parse & stringify CST of :${x[0]} messages`, x[1]] as const
  )
]) {
  describe(title, () => {
    for (const testMsg of messages) {
      test(testName(testMsg), () => {
        const cst = parseCST(testMsg.src);
        expect(cst.errors).toHaveLength(0);
        const src = stringifyCST(cst);
        expect(src.replace(/\n/g, ' ')).toBe(testMsg.cleanSrc ?? testMsg.src);
      });
    }
  });
}
