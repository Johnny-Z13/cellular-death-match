import { describe, expect, it } from 'vitest';
import { createMumblePlayer } from '../../src/audio/mumblePlayer';
import { DR_E_VOICE } from '../../src/content/drETuning';

function fakeContext() {
  const started: number[] = [];
  const stopped: number[] = [];
  let made = 0;
  const ctx = {
    currentTime: 2,
    createBuffer: (channels: number, length: number, rate: number) => ({ channels, length, rate, copyToChannel: () => undefined }),
    createBufferSource: () => {
      const id = made++;
      return {
        buffer: null, onended: null,
        connect: (node: unknown) => node, disconnect: () => undefined,
        start: () => { started.push(id); }, stop: () => { stopped.push(id); },
      };
    },
    createGain: () => ({ gain: { value: 1 }, connect: (node: unknown) => node, disconnect: () => undefined }),
  };
  return { ctx: ctx as unknown as AudioContext, destination: {} as AudioNode, started, stopped };
}

describe('mumble player', () => {
  it('speaks a line and returns its plan and start time', () => {
    const { ctx, destination, started } = fakeContext();
    const utterance = createMumblePlayer(ctx, destination).say('Oh! A visitor!', DR_E_VOICE);
    expect(utterance).not.toBeNull();
    expect(utterance!.plan.words.map((w) => w.text)).toEqual(['Oh', 'A', 'visitor']);
    expect(utterance!.startedAt).toBe(2);
    expect(utterance!.peak).toBeLessThanOrEqual(0.7);
    expect(started).toEqual([0]);
  });

  it('stops the line already playing when a new one starts', () => {
    const { ctx, destination, started, stopped } = fakeContext();
    const player = createMumblePlayer(ctx, destination);
    player.say('First line.', DR_E_VOICE);
    player.say('Second line.', DR_E_VOICE);
    expect(started).toEqual([0, 1]);
    expect(stopped).toEqual([0]);
  });

  it('returns null, and plays nothing, for lines the engine cannot say', () => {
    const { ctx, destination, started } = fakeContext();
    const player = createMumblePlayer(ctx, destination);
    expect(player.say('...', DR_E_VOICE)).toBeNull();
    expect(player.say('a'.repeat(181), DR_E_VOICE)).toBeNull();
    expect(player.say('', DR_E_VOICE)).toBeNull();
    expect(started).toEqual([]);
  });

  it('pauses on the script ellipsis', () => {
    const { ctx, destination } = fakeContext();
    const player = createMumblePlayer(ctx, destination);
    const withPause = player.say('Closer… hold it!', DR_E_VOICE)!;
    const without = player.say('Closer hold it!', DR_E_VOICE)!;
    expect(withPause.plan.duration).toBeGreaterThan(without.plan.duration);
    expect(withPause.text).toBe('Closer… hold it!');
  });
});
