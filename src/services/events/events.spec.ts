import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "./index";

describe("EventEmitter", () => {
  let events: EventEmitter;

  beforeEach(() => {
    events = new EventEmitter();
  });

  it("should register and trigger event handlers", () => {
    const handler = vi.fn();
    events.on("test-event", handler);
    events.emit("test-event", { data: "test" });
    expect(handler).toHaveBeenCalledWith({ data: "test" });
  });

  it("should allow multiple handlers for same event", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    events.on("test-event", handler1);
    events.on("test-event", handler2);
    events.emit("test-event");
    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it("should remove event handler", () => {
    const handler = vi.fn();
    events.on("test-event", handler);
    events.off("test-event", handler);
    events.emit("test-event");
    expect(handler).not.toHaveBeenCalled();
  });

  it("should handle events with no registered handlers", () => {
    expect(() => {
      events.emit("non-existent-event");
    }).not.toThrow();
  });

  it("should handle removing non-existent handler", () => {
    const handler = vi.fn();
    expect(() => {
      events.off("test-event", handler);
    }).not.toThrow();
  });
});
