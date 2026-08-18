export type AdRequestResult = 'disabled';

export interface AdManager {
  isEnabled(): boolean;
  requestRewarded(reason: string): Promise<AdRequestResult>;
  requestMidgame(reason: string): Promise<AdRequestResult>;
}

export function createDisabledAdManager(): AdManager {
  return {
    isEnabled() {
      return false;
    },
    async requestRewarded(reason) {
      void reason;
      return 'disabled';
    },
    async requestMidgame(reason) {
      void reason;
      return 'disabled';
    },
  };
}
