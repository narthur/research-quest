type EventCallback = (...args: any[]) => void;

export class EventEmitter {
  private events: Map<string, Set<EventCallback>>;

  constructor() {
    this.events = new Map();
  }

  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)?.add(callback);
  }

  off(event: string, callback: EventCallback) {
    this.events.get(event)?.delete(callback);
  }

  emit(event: string, ...args: any[]) {
    this.events.get(event)?.forEach(callback => callback(...args));
  }
}
