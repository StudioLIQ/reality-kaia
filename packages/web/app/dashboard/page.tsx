"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAddresses } from "@/lib/contracts.client";
import { useQuestions as useQuestionsChain } from "@/lib/useQuestions";
import { useQuestionsSubgraph } from "@/lib/useQuestionsSubgraph";
import QuestionFilters, { type QuestionRow } from "@/components/QuestionFilters";
import StatCard from "@/components/StatCard";
import { DataTable, Th, Td, TRow } from "@/components/DataTable";
import { deriveStatus, computeDeadline } from "@/lib/status";
import FlashBanner from "@/components/FlashBanner";

export default function DashboardPage() {
  const { chainId, addr, ready: addrReady, loading: addrLoading, error: addrError } = useAddresses();
  const useQ = process.env.NEXT_PUBLIC_SUBGRAPH_URL ? useQuestionsSubgraph : useQuestionsChain;
  const { items, loading, error } = useQ();

  // map to QuestionRow shape filters expect
  const rows: QuestionRow[] = useMemo(() => items.map((q) => ({
    id: q.id,
    asker: q.asker,
    createdAt: q.createdAt,
    openingTs: q.openingTs,
    timeoutSec: q.timeoutSec,
    finalized: false,
    bondTokenSymbol: undefined,
    currentBondRaw: undefined,
    text: q.question,
  })), [items]);

  const [filtered, setFiltered] = useState<QuestionRow[]>([]);
  
  // Initialize/sync filtered with current rows when source changes
  useEffect(() => {
    setFiltered(rows);
  }, [rows]);
  
  // Memoize the onChange handler to prevent infinite loops
  const handleFilterChange = useCallback((filteredRows: QuestionRow[]) => {
    setFiltered(filteredRows);
  }, []);

  const nowSec = Math.floor(Date.now() / 1000);

  // Move useMemo before any conditional returns
  const stats = useMemo(() => {
    const openQuestions = filtered.filter((q) => !q.finalized).length;
    const totalQuestions = filtered.length;
    const totalBondValue = 0; // unknown without on-chain calls per row
    return { openQuestions, totalQuestions, totalBondValue };
  }, [filtered]);

  // Loading guards for deployments
  if (addrLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-r-transparent" />
            <p className="mt-4 text-white/60">Loading network deployments...</p>
          </div>
        </div>
      </div>
    );
  }

  if (addrError || !addrReady) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-300">
          Missing deployment info for chain {chainId}. Ensure
          <code className="mx-1 px-1 rounded bg-black/40">/deployments/{chainId}.json</code>
          contains <code className="px-1 rounded bg-black/40">realitioERC20</code> in
          <code className="mx-1 px-1 rounded bg-black/40">packages/web/public/deployments</code>.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <FlashBanner />
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="mt-1 text-sm text-white/60">Browse and answer oracle questions</p>
      </div>

      {/* Errors */}
      {error && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-amber-300">
          {String(error)}
        </div>
      )}

      {/* Filters */}
      <QuestionFilters items={rows} onChange={handleFilterChange} />

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard title="Total Questions" value={stats.totalQuestions.toString()} trend="up" />
        <StatCard title="Open Questions" value={stats.openQuestions.toString()} meta={<span>Active now</span>} />
        <StatCard title="Total Bonds" value={`${stats.totalBondValue.toFixed(2)}`} meta={<span>All tokens</span>} />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <p className="text-white/60 text-center">No questions match your filters.</p>
          <div className="mt-4 text-center">
            <Link
              href="/create"
              className="inline-flex items-center px-4 py-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 text-sm font-medium transition-colors"
            >
              Create Question
            </Link>
          </div>
        </div>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>Question</Th>
              <Th>Status</Th>
              <Th align="center">Opens</Th>
              <Th align="center">Deadline</Th>
              <Th align="center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => {
              const status = deriveStatus(q, nowSec);
              const deadline = computeDeadline(q);
              const statusColors = {
                SCHEDULED: "bg-blue-400/10 text-blue-400 border-blue-400/30",
                OPEN: "bg-emerald-400/10 text-emerald-400 border-emerald-400/30",
                ANSWERED: "bg-amber-400/10 text-amber-400 border-amber-400/30",
                FINALIZED: "bg-white/10 text-white/60",
                DISPUTED: "bg-red-400/10 text-red-400 border-red-400/30",
              } as const;

              return (
                <TRow key={q.id}>
                  <Td>
                    <div className="max-w-xs">
                      <p className="text-white font-medium truncate">{q.text || q.question || q.id}</p>
                      <p className="text-xs text-white/40 mt-1">ID: {q.id.slice(0, 10)}...</p>
                    </div>
                  </Td>
                  <Td>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full border ${statusColors[status]}`}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </span>
                  </Td>
                  <Td align="center" className="text-white/60 text-sm">
                    {q.openingTs ? new Date(q.openingTs * 1000).toLocaleString() : "-"}
                  </Td>
                  <Td align="center" className="text-white/60 text-sm">
                    {deadline ? new Date(deadline * 1000).toLocaleString() : "-"}
                  </Td>
                  <Td align="center">
                    <Link
                      href={`/q/${q.id}`}
                      className="inline-flex items-center px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 text-white/80 text-xs font-medium transition-colors"
                    >
                      View
                    </Link>
                  </Td>
                </TRow>
              );
            })}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
