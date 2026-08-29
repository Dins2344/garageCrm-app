module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.ts'],

  /**
   * Jest's 5s default is a Node-unit-test number and does not fit React Native
   * component tests. Mounting a large screen through jest-expo costs most of a
   * second on a warm, idle machine, and that cost is dominated by first render
   * and module resolution — both of which balloon under parallel load.
   *
   * Measured on one machine, same commit, `SettingsScreen.country.test.tsx`'s
   * first test: 756ms, then 1134ms, then 3174ms. A 4x spread on identical code.
   * On a 2-core CI runner sharing cores across suites it crossed 5s and failed
   * the build — a timing lottery, not a regression.
   *
   * 20s is deliberately generous: long enough that load never fails a passing
   * test, short enough that a genuine hang (an unresolved promise, a `waitFor`
   * on something that never appears) still fails rather than stalling CI.
   */
  testTimeout: 20000,
};
