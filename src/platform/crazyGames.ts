import type { KeyValueStorage } from './storage';

export interface CrazyGamesSdk {
  init(): Promise<void>;
  game?: {
    gameplayStart(): void;
    gameplayStop(): void;
    loadingStart?(): void;
    loadingStop?(): void;
  };
  data?: KeyValueStorage;
  user?: {
    systemInfo?: {
      applicationType?: string;
    };
  };
}

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: CrazyGamesSdk;
    };
  }
}

export interface CrazyGamesPlatform {
  init(): Promise<boolean>;
  isSdkAvailable(): boolean;
  isInitialized(): boolean;
  isGameplayStarted(): boolean;
  startGameplay(reason: string): void;
  stopGameplay(reason: string): void;
  getDataModule(): KeyValueStorage | null;
  getApplicationType(): string | null;
  getLastTransitionReason(): string | null;
}

export interface CrazyGamesPlatformOptions {
  win?: Pick<Window, 'CrazyGames'>;
}

export function createCrazyGamesPlatform(options: CrazyGamesPlatformOptions = {}): CrazyGamesPlatform {
  const win = options.win;
  let initialized = false;
  let initializing: Promise<boolean> | null = null;
  let gameplayStarted = false;
  let gameplayStartSent = false;
  let lastTransitionReason: string | null = null;

  const sdk = () => win?.CrazyGames?.SDK ?? null;
  const sendGameplayStart = () => {
    if (gameplayStartSent || !initialized) return;
    try {
      sdk()?.game?.gameplayStart();
      gameplayStartSent = true;
    } catch {
      // Gameplay tracking must never break local or Basic Launch gameplay.
    }
  };

  return {
    async init() {
      if (initialized) return true;
      if (initializing) return initializing;
      const current = sdk();
      if (!current) return false;
      initializing = current.init()
        .then(() => {
          initialized = true;
          if (gameplayStarted) sendGameplayStart();
          return true;
        })
        .catch(() => false);
      return initializing;
    },
    isSdkAvailable() {
      return sdk() !== null;
    },
    isInitialized() {
      return initialized;
    },
    isGameplayStarted() {
      return gameplayStarted;
    },
    startGameplay(reason) {
      lastTransitionReason = reason;
      if (gameplayStarted) return;
      gameplayStarted = true;
      sendGameplayStart();
    },
    stopGameplay(reason) {
      lastTransitionReason = reason;
      if (!gameplayStarted) return;
      gameplayStarted = false;
      gameplayStartSent = false;
      try {
        if (initialized) sdk()?.game?.gameplayStop();
      } catch {
        // Gameplay tracking must never break local or Basic Launch gameplay.
      }
    },
    getDataModule() {
      return sdk()?.data ?? null;
    },
    getApplicationType() {
      return sdk()?.user?.systemInfo?.applicationType ?? null;
    },
    getLastTransitionReason() {
      return lastTransitionReason;
    },
  };
}
