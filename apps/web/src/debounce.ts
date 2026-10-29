/** Calls `fn` once, `ms` after the last call; `flush()` runs a pending call now. */
export function debounced(fn: () => void, ms: number): { call: () => void; flush: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  return {
    call: () => {
      cancel();
      timer = setTimeout(() => {
        timer = undefined;
        fn();
      }, ms);
    },
    flush: () => {
      if (timer === undefined) return;
      cancel();
      fn();
    },
    cancel,
  };
}
