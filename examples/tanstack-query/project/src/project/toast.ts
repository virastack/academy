import { useSyncExternalStore } from "react";

let message: string | null = null;
const listeners = new Set<() => void>();

export function showToast(text: string) {
  message = text;
  listeners.forEach((listener) => listener());
  setTimeout(() => {
    message = null;
    listeners.forEach((listener) => listener());
  }, 3000);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useToast() {
  return useSyncExternalStore(subscribe, () => message);
}
