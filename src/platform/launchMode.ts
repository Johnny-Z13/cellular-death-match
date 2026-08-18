import type { KeyValueStorage } from './storage';

export const MERGE_LAB_LAUNCH_KEY = 'cdm.launch.merge-lab';

export interface LaunchLocation {
  search: string;
  hash: string;
}

export function shouldLaunchMergeLab(
  location: LaunchLocation,
  storage?: Pick<KeyValueStorage, 'getItem'> | null,
): boolean {
  const params = new URLSearchParams(location.search);
  if (truthyParam(params.get('cg')) || truthyParam(params.get('mergeLab'))) return true;
  if (params.get('mode') === 'merge-lab') return true;
  if (location.hash === '#merge-lab') return true;
  try {
    return storage?.getItem(MERGE_LAB_LAUNCH_KEY) === '1';
  } catch {
    return false;
  }
}

function truthyParam(value: string | null): boolean {
  return value === '1' || value === 'true' || value === 'yes';
}
