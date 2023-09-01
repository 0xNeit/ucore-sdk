import { UcoreInstance } from './types';

/**
 * This function acts like a decorator for all methods that interact with the
 *     blockchain. In order to use the correct Ucore Protocol addresses, the
 *     Ucore SDK must know which network its provider points to. This
 *     function holds up a transaction until the main constructor has determined
 *     the network ID.
 *
 * @hidden
 *
 * @param {Ucore} _ucore The instance of the UCore SDK.
 *
 */
export async function netId(_ucore: UcoreInstance): Promise<void> {
  if (_ucore._networkPromise) {
    await _ucore._networkPromise;
  }
}
