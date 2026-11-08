export type AlertQueue<T> = {
  current: T | null;
  pending: T[];
};

export function emptyAlertQueue<T>(): AlertQueue<T> {
  return { current: null, pending: [] };
}

/** If a modal is already showing, keep it and enqueue; otherwise show immediately. */
export function enqueueAlert<T>(state: AlertQueue<T>, item: T): AlertQueue<T> {
  if (state.current) {
    return { current: state.current, pending: [...state.pending, item] };
  }
  return { current: item, pending: state.pending };
}

/** Close the visible modal and promote the next queued one, if any. */
export function dequeueAlert<T>(state: AlertQueue<T>): AlertQueue<T> {
  const [next, ...rest] = state.pending;
  return { current: next ?? null, pending: rest };
}
