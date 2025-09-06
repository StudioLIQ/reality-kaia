// packages/web/lib/bus.ts
// Tiny in-memory event bus to optimistically surface newly created questions.
type QuestionCreated = { chainId: number; questionId: `0x${string}` };
const listeners = new Set<(e: QuestionCreated) => void>();

export const bus = {
  emit: (e: QuestionCreated) => listeners.forEach((l) => l(e)),
  on: (fn: (e: QuestionCreated) => void) => {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};
