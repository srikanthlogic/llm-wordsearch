// @vitest-environment node
import { describe, expect, it } from 'vitest';

// #138: the self-host server imports this module in Node, where the
// localStorage/sessionStorage identifiers do not exist. The availability
// probes used to throw ReferenceError (from the module-load migration via
// safeSetItem — caught, but printing a browser-only stack trace on every
// boot). The probes must report "unavailable" instead of throwing.
describe('storageService in Node (#138)', () => {
  it('imports cleanly and reports storage unavailable instead of throwing', async () => {
    const mod = await import('../../services/storageService');
    expect(mod.isLocalStorageAvailable()).toBe(false);
    expect(mod.isSessionStorageAvailable()).toBe(false);
  });
});
