const listeners = new Set();

export const sessionEvents = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  emitInvalidated() {
    listeners.forEach((listener) => listener());
  }
};
