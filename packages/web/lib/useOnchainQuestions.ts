"use client";
import { useEffect, useMemo, useState } from "react";
import { useChainId } from "wagmi";
import { createPublicClient, http } from "viem";
import { useAddresses } from "@/lib/contracts.client";
import { realityV3Abi } from "@/lib/abi/realityV3";
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
  const chainId = useChainId() || 8217;
  const { addr, ready } = useAddresses();
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Full[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const rpc =
    chainId === 8217
      ? process.env.NEXT_PUBLIC_RPC_MAINNET ?? "https://public-en.node.kaia.io"
      : process.env.NEXT_PUBLIC_RPC_TESTNET ?? "https://public-en-kairos.node.kaia.io";
  const client = useMemo(() => createPublicClient({ transport: http(rpc) } as any), [rpc]);

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
      setRows(mapped);
      try {
        localStorage.setItem(cacheKey(p), JSON.stringify({ t: Date.now(), total: tot, rows: mapped }));
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