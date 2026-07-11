// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { createEcologyAudio } from '../../src/audio/ecologyAudio';

// The sim soundscape must obey the same mute toggle as uiAudio — otherwise the
// Sound button silences taps/ambience while eat/fight/hatch sounds keep playing
// from the second engine.

function fakeParam() {
  return {
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  };
}

function fakeNode() {
  return {
    type: '',
    buffer: null,
    gain: fakeParam(),
    frequency: fakeParam(),
    Q: { value: 0 },
    connect(next: unknown) { return next; },
    start() {},
    stop() {},
  };
}

class FakeAudioContext {
  currentTime = 1;
  state = 'running';
  sampleRate = 44100;
  destination = fakeNode();
  gains: ReturnType<typeof fakeNode>[] = [];
  oscillatorsCreated = 0;
  createGain() {
    const node = fakeNode();
    this.gains.push(node);
    return node;
  }
  createOscillator() {
    this.oscillatorsCreated += 1;
    return fakeNode();
  }
  createBiquadFilter() { return fakeNode(); }
  createBufferSource() { return fakeNode(); }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  resume() {}
}

const activityFrame = {
  eating: 10,
  fighting: 0,
  reactions: 0,
  mutations: 0,
  hatches: 0,
  events: [],
};

function installFakeAudio(): FakeAudioContext[] {
  const instances: FakeAudioContext[] = [];
  (globalThis as { window?: unknown }).window = {
    AudioContext: class extends FakeAudioContext {
      constructor() {
        super();
        instances.push(this);
      }
    },
  };
  return instances;
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe('ecology audio mute', () => {
  it('plays sim sounds while unmuted (fake harness sanity check)', () => {
    const instances = installFakeAudio();
    const audio = createEcologyAudio();
    audio.update(activityFrame);
    expect(instances.length).toBe(1);
    expect(instances[0]?.oscillatorsCreated ?? 0).toBeGreaterThan(0);
  });

  it('schedules nothing while muted', () => {
    const instances = installFakeAudio();
    const audio = createEcologyAudio();
    audio.setMuted(true);
    audio.update(activityFrame);
    expect(instances.length).toBe(0);
  });

  it('zeroes the master gain so in-flight tails cut off, and restores it on unmute', () => {
    const instances = installFakeAudio();
    const audio = createEcologyAudio();
    audio.update(activityFrame);
    const master = instances[0]?.gains[0];
    if (!master) throw new Error('master gain was never created');
    expect(master.gain.value).toBeGreaterThan(0);
    const unmutedGain = master.gain.value;
    audio.setMuted(true);
    expect(master.gain.value).toBe(0);
    audio.setMuted(false);
    expect(master.gain.value).toBe(unmutedGain);
  });

  it('is wired to the Sound toggle and the persisted preference in main.ts', () => {
    const mainSource = readFileSync('src/main.ts', 'utf8') as string;
    expect(mainSource).toContain('ecologyAudio.setMuted(nowMuted)');
    expect(mainSource).toContain('ecologyAudio.setMuted(uiAudio.isMuted())');
  });
});
