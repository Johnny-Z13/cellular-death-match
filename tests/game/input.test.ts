import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createInput } from '../../src/game/input';

// Minimal DOM stand-in: the input module attaches keydown/keyup listeners
// to a target. We pass a mock target and dispatch events manually.
class MockTarget {
  private handlers = new Map<string, ((e: { key: string }) => void)[]>();
  addEventListener(type: string, fn: (e: { key: string }) => void): void {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type)!.push(fn);
  }
  removeEventListener(type: string, fn: (e: { key: string }) => void): void {
    const h = this.handlers.get(type);
    if (!h) return;
    const idx = h.indexOf(fn);
    if (idx !== -1) h.splice(idx, 1);
  }
  dispatch(type: string, key: string): void {
    const h = this.handlers.get(type) ?? [];
    for (const fn of h) fn({ key });
  }
}

describe('createInput', () => {
  let target: MockTarget;
  beforeEach(() => {
    target = new MockTarget();
  });
  afterEach(() => { /* MockTarget is GC'd */ });

  it('starts with zero vector and not firing', () => {
    const input = createInput(target as unknown as EventTarget);
    const s = input.poll();
    expect(s.moveVec).toEqual([0, 0]);
    expect(s.shouldFire).toBe(false);
  });

  it('arrow up sets moveVec to [0, -1] (negative y, upward on screen)', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', 'ArrowUp');
    const s = input.poll();
    expect(s.moveVec).toEqual([0, -1]);
  });

  it('WASD also works as movement', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', 'd');           // d = right
    const s = input.poll();
    expect(s.moveVec).toEqual([1, 0]);
  });

  it('combined keys produce normalized diagonal', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', 'ArrowUp');
    target.dispatch('keydown', 'ArrowRight');
    const s = input.poll();
    // Up = [0, -1], Right = [1, 0]; combined raw [1, -1], normalized.
    const inv = 1 / Math.sqrt(2);
    expect(s.moveVec[0]).toBeCloseTo(inv, 5);
    expect(s.moveVec[1]).toBeCloseTo(-inv, 5);
  });

  it('keyup removes a key from movement', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', 'ArrowUp');
    target.dispatch('keyup', 'ArrowUp');
    const s = input.poll();
    expect(s.moveVec).toEqual([0, 0]);
  });

  it('space sets shouldFire while held', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', ' ');
    const s1 = input.poll();
    expect(s1.shouldFire).toBe(true);
    target.dispatch('keyup', ' ');
    const s2 = input.poll();
    expect(s2.shouldFire).toBe(false);
  });

  it('lastFireDir remembers last non-zero movement when current is zero', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', 'ArrowDown');
    input.poll(); // moveVec = [0, 1]; lastFireDir captured
    target.dispatch('keyup', 'ArrowDown');
    const s = input.poll();
    expect(s.moveVec).toEqual([0, 0]);
    expect(s.lastFireDir).toEqual([0, 1]);
  });

  it('shift sets shouldEngulf', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', 'Shift');
    const s = input.poll();
    expect(s.shouldEngulf).toBe(true);
  });

  it('e sets shouldEngulf', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', 'e');
    const s = input.poll();
    expect(s.shouldEngulf).toBe(true);
  });

  it('shouldEngulf is false when no engulf key held', () => {
    const input = createInput(target as unknown as EventTarget);
    target.dispatch('keydown', 'd');
    const s = input.poll();
    expect(s.shouldEngulf).toBe(false);
  });
});
