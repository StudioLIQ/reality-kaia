"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { bus } from "@/lib/bus";

export type QuestionListItem = {
  id: `0x${string}`;
  asker?: `0x${string}`;
  templateId?: number;
  openingTs?: number;
  timeoutSec?: number;
  contentHash?: `0x${string}`;
  finalized?: boolean;
  bestAnswer?: `0x${string}`;
  bestBond?: string;
  bestAnswerer?: `0x${string}`;
  lastAnswerTs?: number;
  createdAt?: number;
  question?: string | null;
};

const DEFAULT_LIMIT = 200;

export function useQuestionsSubgraph() {
  const endpoint = process.env.NEXT_PUBLIC_SUBGRAPH_URL as string | undefined;
  const [items, setItems] = useState<QuestionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<string | null>(null);
  const timer = useRef<any>(null);

  const query = useMemo(() => `
    query Q($first: Int!) {
      questions(first: $first, orderBy: createdTs, orderDirection: desc) {
        id
        asker
        templateId
        openingTs
        timeout
        contentHash
        createdTs
        finalized
        bestAnswer
        bestBond
        bestAnswerer
        lastAnswerTs
      }
    }
  `, []);

  async function fetchOnce() {
    if (!endpoint) return;
    setLoading(true); setErr(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query, variables: { first: DEFAULT_LIMIT } }),
      });
      if (!res.ok) throw new Error(`Subgraph HTTP ${res.status}`);
      const json = await res.json();
      if (json.errors) throw new Error(json.errors?.[0]?.message || 'Subgraph error');
      const rows = (json.data?.questions || []) as any[];
      const mapped: QuestionListItem[] = rows.map((r) => {
        const id = (r.id || r.questionId || r.question_id) as `0x${string}`;
        const asker = (r.asker || r.user) as `0x${string}` | undefined;
        const templateId = Number(r.templateId ?? r.template_id ?? r.template ?? 0);
        const openingTs = Number(r.openingTs ?? r.opening_ts ?? r.openingTS ?? 0) || undefined;
        const timeoutSec = Number(r.timeout ?? r.timeoutSec ?? r.timeout_sec ?? 0) || undefined;
        const contentHash = (r.contentHash ?? r.content_hash) as `0x${string}` | undefined;
        const finalized = Boolean(r.finalized ?? r.isFinalized ?? false);
        const bestAnswer = (r.bestAnswer ?? r.best_answer) as `0x${string}` | undefined;
        const bestBond = (r.bestBond ?? r.best_bond) as string | undefined;
        const bestAnswerer = (r.bestAnswerer ?? r.best_answerer) as `0x${string}` | undefined;
        const lastAnswerTs = Number(r.lastAnswerTs ?? r.last_answer_ts ?? 0) || undefined;
        const createdAt = Number(r.createdTs ?? r.created_ts ?? r.createdAt ?? 0) || undefined;
        const question = (r.question ?? r.text ?? null) as string | null;
        return {
          id, asker, templateId, openingTs, timeoutSec, contentHash, finalized,
          bestAnswer, bestBond, bestAnswerer, lastAnswerTs, createdAt, question,
        } as QuestionListItem;
      });
      setItems(mapped);
    } catch (e: any) {
      setErr(e?.message || 'Failed to query subgraph');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!endpoint) return;
    fetchOnce();
    timer.current = setInterval(fetchOnce, 10000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [endpoint]);

  // optimistic bus: add placeholder row immediately
  useEffect(() => {
    const off = bus.on((e) => {
      setItems((prev) => prev.some((x) => x.id === e.questionId)
        ? prev
        : [{ id: e.questionId }, ...prev]);
    });
    return off;
  }, []);

  return { items, loading, error };
}
