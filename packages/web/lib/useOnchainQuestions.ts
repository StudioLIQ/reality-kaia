"use client";
import { useEffect, useMemo, useState } from "react";
import { useChainId } from "wagmi";
import { createPublicClient, http } from "viem";
import { getPublicClient } from "@/lib/viem";
import { useAddresses } from "@/lib/contracts.client";
import { realityV3Abi } from "@/lib/abi/realityV3";
import { realityAbi } from "@/lib/abi/reality";
import { realityV2Abi } from "@/lib/abi/realityV2";

type Full = {
  id: `0x${string}`;
  asker: `0x${string}`;
  arbitrator: `0x${string}`;
  bondToken: `0x${string}`;
  templateId: number;
  timeoutSec: number;
  openingTs: number;
  contentHash: `0x${string}`;
  createdAt: number;
  content: string;
  outcomesPacked: string;
  language: string;
  category: string;
  metadataURI: string;
  lastAnswerTs: number;
  bestAnswer: `0x${string}`;
  bestBond: bigint;
  finalized: boolean;
  pendingArbitration: boolean;
};

export function useOnchainQuestions(pageSize = 20) {
  const chainId = useChainId() || 1001;
  const { addr, ready } = useAddresses();
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Full[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Use chain-aware public client so we query the right network
  const client = useMemo(() => getPublicClient(chainId), [chainId]);

  const cacheKey = (p: number) => `ora:q:${chainId}:${p}:${pageSize}`;

  async function loadPage(p: number) {
    if (!ready || !addr.reality) return;
    setLoading(true);
    setErr(null);
    try {
      // Try V3 first
      const tot = Number(
        await client.readContract({
          address: addr.reality!,
          abi: realityV3Abi,
          functionName: "totalQuestions"
        })
      );
      setTotal(tot);
      const offset = p * pageSize;
      const ids = (await client.readContract({
        address: addr.reality!,
        abi: realityV3Abi,
        functionName: "getQuestionsDesc",
        args: [BigInt(offset), BigInt(pageSize)]
      })) as `0x${string}`[];
      if (!ids.length) {
        setRows([]);
        setLoading(false);
        return;
      }
      const batch = (await client.readContract({
        address: addr.reality!,
        abi: realityV3Abi,
        functionName: "getQuestionFullBatch",
        args: [ids]
      })) as any[];
      const mapped: Full[] = batch.map((q, i) => ({
        id: ids[i],
        asker: q[0],
        arbitrator: q[1],
        bondToken: q[2],
        templateId: Number(q[3]),
        timeoutSec: Number(q[4]),
        openingTs: Number(q[5]),
        contentHash: q[6],
        createdAt: Number(q[7]),
        content: q[8],
        outcomesPacked: q[9],
        language: q[10],
        category: q[11],
        metadataURI: q[12],
        lastAnswerTs: Number(q[13]),
        bestAnswer: q[14],
        bestBond: BigInt(q[15]),
        finalized: !!q[16],
        pendingArbitration: !!q[17]
      }));
      // Lightweight recent-log merge: include very recent questions even if not registered in V3
      let finalRows: Full[] = mapped;
      try {
        const head = await client.getBlockNumber();
        const LIGHT_LOOKBACK = BigInt(Number(process.env.NEXT_PUBLIC_LOG_MERGE_LOOKBACK || '5000'));
        const MAX_EXTRAS = Number(process.env.NEXT_PUBLIC_LOG_MERGE_LIMIT || '10');
        const fromBlock = head > LIGHT_LOOKBACK ? head - LIGHT_LOOKBACK : 0n;
        const logs = await (client as any).getLogs({
          address: addr.reality!,
          fromBlock,
          toBlock: head,
          abi: realityAbi as any,
          eventName: "LogNewQuestion",
        });

        const existing = new Set(finalRows.map((r) => r.id));
        const extraIds: `0x${string}`[] = [];
        for (const log of logs as any[]) {
          const ev = (log as any).args as any;
          const topicQid = (log.topics && log.topics[1]) ? (log.topics[1] as `0x${string}`) : undefined;
          const id = (ev?.questionId as `0x${string}`) ?? (Array.isArray(ev) ? (ev[0] as `0x${string}`) : undefined) ?? topicQid;
          if (!id) continue;
          if (!existing.has(id)) {
            existing.add(id);
            extraIds.push(id);
            if (extraIds.length >= MAX_EXTRAS) break; // cap to keep it lightweight
          }
        }

        if (extraIds.length > 0) {
          try {
            const extraBatch = (await client.readContract({
              address: addr.reality!,
              abi: realityV3Abi,
              functionName: "getQuestionFullBatch",
              args: [extraIds],
            })) as any[];
            const extras: Full[] = extraBatch.map((q, i) => ({
              id: extraIds[i],
              asker: q[0],
              arbitrator: q[1],
              bondToken: q[2],
              templateId: Number(q[3]),
              timeoutSec: Number(q[4]),
              openingTs: Number(q[5]),
              contentHash: q[6],
              createdAt: Number(q[7]),
              content: q[8],
              outcomesPacked: q[9],
              language: q[10],
              category: q[11],
              metadataURI: q[12],
              lastAnswerTs: Number(q[13]),
              bestAnswer: q[14],
              bestBond: BigInt(q[15] || 0),
              finalized: !!q[16],
              pendingArbitration: !!q[17],
            }));
            // Merge and sort by createdAt desc
            const map = new Map<string, Full>();
            for (const r of [...finalRows, ...extras]) map.set(r.id, r);
            finalRows = Array.from(map.values()).sort((a,b)=> Number(b.createdAt||0) - Number(a.createdAt||0));
          } catch {}
        }
      } catch {}

      setRows(finalRows);
      try {
        localStorage.setItem(cacheKey(p), JSON.stringify({ t: Date.now(), total: tot, rows: finalRows }));
      } catch {}
    } catch (e: any) {
      // V3 failed, try V2 fallback with log scanning
      try {
        await loadV2Fallback(p);
      } catch (v2Error: any) {
        setErr(v2Error?.message || String(v2Error));
        // Try to load from cache
        try {
          const raw = localStorage.getItem(cacheKey(page));
          if (raw) {
            const parsed = JSON.parse(raw);
            setTotal(parsed.total);
            setRows(parsed.rows || []);
          }
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadV2Fallback(p: number) {
    if (!addr.reality) return;
    
    // Use log scanning for V2
    const LOOKBACK = 50000n;
    const currentBlock = await client.getBlockNumber();
    const fromBlock = currentBlock > LOOKBACK ? currentBlock - LOOKBACK : 0n;
    
    // Get LogNewQuestion events
    const logs = await (client as any).getLogs({
      address: addr.reality,
      fromBlock,
      toBlock: currentBlock
    });
    
    // Sort by block number descending (newest first)
    const sortedLogs = logs.sort((a: any, b: any) => Number(b.blockNumber) - Number(a.blockNumber));
    
    // Paginate
    const offset = p * pageSize;
    const pagedLogs = sortedLogs.slice(offset, offset + pageSize);
    
    // For each question, try to get V2 metadata or fallback to basic info
    const questions: Full[] = [];
    for (const log of pagedLogs) {
      // Extract question ID from topics (first indexed param)
      const qid = log.topics?.[1] as `0x${string}`;
      if (!qid) continue;
      let questionData: Full;
      
      try {
        // Try V2 getQuestionFull
        const v2Data = await client.readContract({
          address: addr.reality!,
          abi: realityV2Abi as any,
          functionName: 'getQuestionFull',
          args: [qid]
        }) as any;
        
        questionData = {
          id: qid,
          asker: v2Data[0],
          arbitrator: v2Data[1],
          bondToken: v2Data[2],
          templateId: Number(v2Data[3]),
          timeoutSec: Number(v2Data[4]),
          openingTs: Number(v2Data[5]),
          contentHash: v2Data[6],
          createdAt: Number(v2Data[7]),
          content: v2Data[8],
          outcomesPacked: v2Data[9],
          language: v2Data[10],
          category: v2Data[11],
          metadataURI: v2Data[12],
          lastAnswerTs: 0,
          bestAnswer: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          bestBond: 0n,
          finalized: false,
          pendingArbitration: false
        };
      } catch {
        // Fallback to minimal data from topics
        const userTopic = log.topics?.[2] as `0x${string}`;
        questionData = {
          id: qid,
          asker: userTopic ? `0x${userTopic.slice(26)}` as `0x${string}` : '0x0000000000000000000000000000000000000000' as `0x${string}`,
          arbitrator: '0x0000000000000000000000000000000000000000' as `0x${string}`,
          bondToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
          templateId: 0,
          timeoutSec: 86400, // default 1 day
          openingTs: 0,
          contentHash: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          createdAt: Number(log.blockNumber),
          content: '',
          outcomesPacked: '',
          language: 'en',
          category: '',
          metadataURI: '',
          lastAnswerTs: 0,
          bestAnswer: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          bestBond: 0n,
          finalized: false,
          pendingArbitration: false
        };
      }
      
      questions.push(questionData);
    }
    
    setTotal(sortedLogs.length);
    setRows(questions);
  }

  useEffect(() => {
    if (ready && addr.reality) loadPage(page);
  }, [ready, addr.reality, page, pageSize]);

  return { chainId, reality: addr.reality, total, page, setPage, pageSize, rows, loading, err };
}
