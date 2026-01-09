import type { WaterbodyRow } from './searchwaterbodies';

type Target = 'prev' | 'next';

type Payload = {
  target: Target;
  waterbody: WaterbodyRow;
};

type Listener = (p: Payload) => void;

const listeners = new Set<Listener>();

export function onWaterbodySelected(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitWaterbodySelected(payload: Payload) {
  for (const fn of listeners) fn(payload);
}
