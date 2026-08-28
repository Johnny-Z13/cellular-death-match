export type NotificationPriority = 1 | 2 | 3 | 4;

export interface DirectedNotification<T> {
  key: string;
  priority: NotificationPriority;
  payload: T;
}

export type EnqueueResult<T> =
  | { action: 'start'; active: DirectedNotification<T> }
  | {
      action: 'replace';
      active: DirectedNotification<T>;
      displaced: DirectedNotification<T>;
    }
  | { action: 'queued' }
  | { action: 'duplicate' }
  | { action: 'dropped' };

interface QueuedNotification<T> extends DirectedNotification<T> {
  order: number;
}

// Mobile feedback has one attention channel. High-priority discoveries can
// interrupt a minor toast, while equal-priority messages retain arrival order.
// The bounded queue prevents a burst of research unlocks from narrating stale
// events long after the player has moved on.
export class NotificationDirector<T> {
  private active: DirectedNotification<T> | null = null;
  private queue: QueuedNotification<T>[] = [];
  private order = 0;

  constructor(private readonly maxQueued = 4) {}

  enqueue(notification: DirectedNotification<T>): EnqueueResult<T> {
    if (this.active?.key === notification.key) {
      if (notification.priority <= this.active.priority) return { action: 'duplicate' };
      const displaced = this.active;
      this.active = notification;
      return { action: 'replace', active: notification, displaced };
    }

    const queuedDuplicateIndex = this.queue.findIndex((queued) => queued.key === notification.key);
    if (queuedDuplicateIndex >= 0) {
      const queuedDuplicate = this.queue[queuedDuplicateIndex]!;
      if (notification.priority <= queuedDuplicate.priority) return { action: 'duplicate' };
      this.queue.splice(queuedDuplicateIndex, 1);
    }

    if (!this.active) {
      this.active = notification;
      return { action: 'start', active: notification };
    }

    if (notification.priority > this.active.priority) {
      const displaced = this.active;
      this.insert(displaced);
      this.active = notification;
      return { action: 'replace', active: notification, displaced };
    }

    const queued = this.insert(notification);
    return queued ? { action: 'queued' } : { action: 'dropped' };
  }

  complete(key: string): DirectedNotification<T> | null {
    if (this.active?.key !== key) return null;
    const next = this.queue.shift() ?? null;
    this.active = next;
    return next;
  }

  getActive(): DirectedNotification<T> | null {
    return this.active;
  }

  getQueued(): readonly DirectedNotification<T>[] {
    return this.queue;
  }

  private insert(notification: DirectedNotification<T>): boolean {
    const entry: QueuedNotification<T> = {
      ...notification,
      order: this.order,
    };
    this.order += 1;
    this.queue.push(entry);
    this.queue.sort((a, b) => b.priority - a.priority || a.order - b.order);
    if (this.queue.length <= this.maxQueued) return true;
    const removed = this.queue.pop();
    return removed !== entry;
  }
}
