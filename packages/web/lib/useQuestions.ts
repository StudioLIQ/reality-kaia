"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPublicClient, http, getAddress } from "viem";
import { useAddresses } from "@/lib/contracts.client";
import { realityAbi } from "@/lib/abi/reality";
import { bus } from "@/lib/bus";

export type QuestionListItem = {
  id: `0x${string}`;          // bytes32
  asker: `0x${string}`;
  templateId: number;
  openingTs: number;
  timeoutSec: number;
  bondToken: `0x${string}`;   // unknown here; left as zero for optimistic
  contentHash?: `0x${string}`;
  question?: string;
  // derived:
  createdAt?: number;         // block timestamp
};

const DEFAULT_FROM_BLOCKS = 20_000n; // adjust to your desired lookback

export function useQuestions() {
  const { chainId, addr, deployments, ready } = useAddresses();
  const [items, setItems] = useState<QuestionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<string | null>(null);

  // public RPC endpoints (env or sane defaults)
  const rpc = process.env.NEXT_PUBLIC_RPC_TESTNET ?? "https://public-en-kairos.node.kaia.io";

  const client = useMemo(
    // Avoid strict chain binding so the RPC URL decides the network
    () => createPublicClient({ chain: undefined as any, transport: http(rpc) }),
    [rpc]
  );

  const unsubRef = useRef<null | (() => void)>(null);

  // Optimistic updates from Create page
  useEffect(() => {
    console.debug('[questions]', { chainId, reality: addr.reality });
    // 1) Load any pending optimistic questions from storage (in case emit happened before listener attached)
    try {
      const raw = localStorage.getItem('oo:new-questions');
      if (raw) {
        const list = JSON.parse(raw) as Array<{ chainId: number; questionId: `0x${string}` }>;
        const mine = list.filter((e) => e.chainId === chainId);
        if (mine.length > 0) {
          setItems((prev) => {
            const ids = new Set(prev.map((x) => x.id));
            const add: QuestionListItem[] = [];
            for (const e of mine) {
              if (ids.has(e.questionId)) continue;
              add.push({
                id: e.questionId,
                asker: "0x0000000000000000000000000000000000000000",
                templateId: 0,
                openingTs: 0,
                timeoutSec: 0,
                bondToken: "0x0000000000000000000000000000000000000000",
              });
            }
            return add.length ? [...add, ...prev] : prev;
          });
        }
      }
    } catch {}

    // 2) Live optimistic events
    const off = bus.on((e) => {
      if (e.chainId !== chainId) return;
      setItems((prev) =>
        prev.some((x) => x.id === e.questionId)
          ? prev
          : [
              {
                id: e.questionId,
                asker: "0x0000000000000000000000000000000000000000",
                templateId: 0,
                openingTs: 0,
                timeoutSec: 0,
                bondToken: "0x0000000000000000000000000000000000000000",
              },
              ...prev,
            ]
      );
    });
    return off;
  }, [chainId]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setErr(null);

      if (!ready || !addr.reality) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        // Get current head
        const head = await client.getBlockNumber();

        // Fetch historical logs
        const fromBlock = head > DEFAULT_FROM_BLOCKS ? head - DEFAULT_FROM_BLOCKS : 0n;

        const logs = await client.getLogs({
          address: addr.reality,
          fromBlock,
          toBlock: head,
          abi: realityAbi as any,
          eventName: "LogNewQuestion",
        } as any);

        // Build initial list
        const base: QuestionListItem[] = [];
        for (const log of logs as any[]) {
          const topicQid = (log.topics && log.topics[1]) ? (log.topics[1] as `0x${string}`) : undefined;
          const ev = (log as any).args;
          const id = (ev?.questionId as `0x${string}`) ?? (Array.isArray(ev) ? ev[0] as `0x${string}` : undefined) ?? topicQid;
          if (!id) continue; // skip malformed
          let createdAt: number | undefined = undefined;
          try {
            if (log.blockHash) {
              const blk = await client.getBlock({ blockHash: log.blockHash });
              createdAt = Number(blk.timestamp);
            }
          } catch {}
          base.push({
            id,
            asker: ev?.asker ? getAddress(ev.asker) : ("0x0000000000000000000000000000000000000000" as `0x${string}`),
            templateId: ev?.templateId != null ? Number(ev.templateId) : 0,
            openingTs: ev?.openingTs != null ? Number(ev.openingTs) : 0,
            timeoutSec: ev?.timeout != null ? Number(ev.timeout) : 0,
            bondToken: "0x0000000000000000000000000000000000000000",
            contentHash: ev?.contentHash,
            question: ev?.question,
            createdAt,
          });
        }

        // Deduplicate by id (in case of reorgs/dupes)
        const unique = new Map<string, QuestionListItem>();
        for (const q of base) unique.set(q.id, q);
        if (!cancelled) setItems(Array.from(unique.values()).sort((a,b)=> (b.createdAt||0) - (a.createdAt||0)));

        // Watch for new events
        try {
          if (unsubRef.current) unsubRef.current();
        } catch {}
        const unwatch = await client.watchContractEvent({
          address: addr.reality,
          abi: realityAbi as any,
          eventName: "LogNewQuestion",
          onLogs: async (newLogs: any[]) => {
            const add: QuestionListItem[] = [];
            for (const log of newLogs) {
              const ev = (log as any).args as any;
              const topicQid = (log.topics && log.topics[1]) ? (log.topics[1] as `0x${string}`) : undefined;
              const id = (ev?.questionId as `0x${string}`) ?? (Array.isArray(ev) ? ev[0] as `0x${string}` : undefined) ?? topicQid;
              if (!id) continue;
              let createdAt: number | undefined = undefined;
              try {
                if (log.blockNumber) {
                  const blk = await client.getBlock({ blockNumber: log.blockNumber });
                  createdAt = Number(blk.timestamp);
                }
              } catch {}

              add.push({
                id,
                asker: ev?.asker ? getAddress(ev.asker) : ("0x0000000000000000000000000000000000000000" as `0x${string}`),
                templateId: ev?.templateId != null ? Number(ev.templateId) : 0,
                openingTs: ev?.openingTs != null ? Number(ev.openingTs) : 0,
                timeoutSec: ev?.timeout != null ? Number(ev.timeout) : 0,
                bondToken: "0x0000000000000000000000000000000000000000",
                contentHash: ev?.contentHash,
                question: ev?.question,
                createdAt,
              });
            }
            // Merge/dedup by id
            setItems((prev) => {
              const map = new Map<string, QuestionListItem>();
              for (const q of prev) map.set(q.id, q);
              for (const q of add) map.set(q.id, q);
              return Array.from(map.values()).sort((a,b)=> (b.createdAt||0) - (a.createdAt||0));
            });
          },
          onError: (e: any) => {
            console.error("watchContractEvent error", e);
          },
        } as any);
        unsubRef.current = unwatch as any;
      } catch (e: any) {
        console.error(e);
        if (!cancelled) setErr(e?.message ?? "Failed to load questions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
      try {
        if (unsubRef.current) unsubRef.current();
      } catch {}
      unsubRef.current = null;
    };
  }, [chainId, addr.reality, ready, client]);

  return { items, loading, error };
}
