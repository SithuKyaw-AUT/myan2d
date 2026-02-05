// A simple event emitter for handling global errors, particularly for Firestore.
type Listener<T> = (data: T) => void;

class EventEmitter<TEventMap> {
  private listeners: {
    [K in keyof TEventMap]?: Listener<TEventMap[K]>[];
  } = {};

  on<K extends keyof TEventMap>(event: K, listener: Listener<TEventMap[K]>) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);

    // Return an unsubscribe function
    return () => this.off(event, listener);
  }

  off<K extends keyof TEventMap>(event: K, listener: Listener<TEventMap[K]>) {
    if (!this.listeners[event]) return;

    this.listeners[event] = this.listeners[event]!.filter(
      (l) => l !== listener
    );
  }

  emit<K extends keyof TEventMap>(event: K, data: TEventMap[K]) {
    if (!this.listeners[event]) return;

    this.listeners[event]!.forEach((listener) => listener(data));
  }
}

import type { FirestorePermissionError } from './errors';

type AppEvents = {
  'permission-error': FirestorePermissionError;
};

export const errorEmitter = new EventEmitter<AppEvents>();
