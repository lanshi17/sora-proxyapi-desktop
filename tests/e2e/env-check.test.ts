import { describe, test } from 'vitest';

describe('Environment Check', () => {
  test('check environment', () => {
    console.log('typeof process:', typeof process);
    console.log('process.versions:', process.versions);
    console.log('process.versions?.node:', process.versions?.node);
    console.log('Is Node:', typeof process !== 'undefined' && process.versions?.node !== undefined);
  });
});
