export type QuestionStatus = "SCHEDULED" | "OPEN" | "ANSWERED" | "FINALIZED" | "DISPUTED";

/**
 * Minimal status derivation from question shape.
 * Expected fields (or adapt to your store):
 * - openingTs (unix seconds)
 * - timeoutSec (seconds)
 * - finalized (boolean)
 * - bestAnswer (bytes32 or string; empty/zero = none)
 * - isPendingArbitration? (optional boolean)
 */
export function deriveStatus(q: any, nowSec: number): QuestionStatus {
  if (q?.finalized) return "FINALIZED";
  if (q?.isPendingArbitration) return "DISPUTED";
  if (nowSec < Number(q.openingTs || 0)) return "SCHEDULED";
  const hasAnswer =
    q?.bestAnswer &&
    typeof q.bestAnswer === "string" &&
    !/^0x0{0,64}$/i.test(q.bestAnswer);
  if (hasAnswer) return "ANSWERED";
  return "OPEN";
}

/** Deadline ≈ openingTs + timeoutSec (0 if missing) */
export function computeDeadline(q: any): number {
  const o = Number(q.openingTs || 0);
  const t = Number(q.timeoutSec || q.timeout || 0);
  if (!o || !t) return 0;
  return o + t;
}