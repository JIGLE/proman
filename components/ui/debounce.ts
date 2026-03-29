// debounce.ts
// Simple debounce utility compatible with fake timers for testing
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  wait: number,
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  function debounced(this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  }
  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;
  };
  return debounced as T & { cancel: () => void };
}
