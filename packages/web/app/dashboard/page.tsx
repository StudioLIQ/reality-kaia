"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { formatUnits } from "viem";
import { useAddresses } from "@/lib/contracts.client";
import { useOnchainQuestions } from "@/lib/useOnchainQuestions";
import QuestionFilters, { type QuestionRow } from "@/components/QuestionFilters";
import StatCard from "@/components/StatCard";
import { DataTable, Th, Td, TRow } from "@/components/DataTable";
import { deriveStatus, computeDeadline } from "@/lib/status";
import FlashBanner from "@/components/FlashBanner";

export default function DashboardPage() {
  const { chainId, addr, ready: addrReady, loading: addrLoading, error: addrError } = useAddresses();
  const { total, page, setPage, pageSize, rows: items, loading, err: error } = useOnchainQuestions(20);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAsker, setCopiedAsker] = useState<string | null>(null);
  const [copiedOpen, setCopiedOpen] = useState<string | null>(null);
  const [copiedDeadline, setCopiedDeadline] = useState<string | null>(null);

  // map to QuestionRow shape filters expect
  const rows: QuestionRow[] = useMemo(() => items.map((q) => {
    const usdt = addr.usdt?.toLowerCase();
    const wkaia = addr.wkaia?.toLowerCase();
    const token = (q as any).bondToken?.toLowerCase?.();
    const symbol = token && usdt && token === usdt ? 'USDT' : token && wkaia && token === wkaia ? 'WKAIA' : undefined;
    return {
      id: q.id,
      asker: q.asker,
      createdAt: q.createdAt,
      openingTs: q.openingTs,
      timeoutSec: q.timeoutSec,
      finalized: q.finalized,
      bondTokenSymbol: symbol as any,
      bondTokenAddress: (q as any).bondToken,
      currentBondRaw: q.bestBond || undefined,
      text: q.content,
    } as QuestionRow;
  }), [items, addr.usdt, addr.wkaia]);

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
              <Th align="right">Bond</Th>
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
                      {q.finalized && (
                        <div className="mt-1">
                          <span className="inline-flex px-2 py-0.5 text-[11px] rounded-full border border-white/10 bg-white/5 text-white/60">
                            ✔ Finalized
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
                        <span>ID: {q.id.slice(0, 10)}...</span>
                        <button
                          type="button"
                          className="px-2 py-0.5 rounded border border-white/10 bg-white/5 text-white/70 hover:text-white"
                          onClick={async () => { try { await navigator.clipboard.writeText(q.id); } catch {}; setCopiedId(q.id); setTimeout(()=> setCopiedId(null), 1200); }}
                          title="Copy full ID"
                        >
                          📋 {copiedId === q.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="text-xs text-white/40 mt-1 flex items-center gap-2 flex-wrap">
                        {q.asker && (
                          <>
                            <span>Asker: {q.asker.slice(0, 6)}…{q.asker.slice(-4)}</span>
                            <button
                              type="button"
                              className="px-2 py-0.5 rounded border border-white/10 bg-white/5 text-white/70 hover:text-white"
                              onClick={async () => { try { await navigator.clipboard.writeText(q.asker!); } catch {}; setCopiedAsker(q.id); setTimeout(()=> setCopiedAsker(null), 1200); }}
                              title="Copy asker address"
                            >
                              📋 {copiedAsker === q.id ? 'Copied' : 'Copy'}
                            </button>
                          </>
                        )}
                        {q.createdAt && (
                          <span title={`unix: ${q.createdAt}`}>• Created: {new Date(Number(q.createdAt) * 1000).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full border ${statusColors[status]}`}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </span>
                  </Td>
                  <Td align="right" className="text-white/70 text-sm" title={(() => {
                    const raw = q.currentBondRaw as any as bigint | undefined;
                    const token = q.bondTokenAddress as string | undefined;
                    const tokenInfo = token ? ` | token: ${token}` : '';
                    return raw && raw !== 0n ? `${raw.toString()} (raw)${tokenInfo}` : token ? `token: ${token}` : '';
                  })()}>
                    {(() => {
                      const raw = q.currentBondRaw as any as bigint | undefined;
                      if (!raw || raw === 0n) return '-';
                      const d = q.bondTokenSymbol === 'USDT' ? 6 : 18;
                      const sym = q.bondTokenSymbol || '';
                      return `${formatUnits(raw, d)} ${sym}`;
                    })()}
                  </Td>
                  <Td align="center" className="text-white/60 text-sm" title={q.openingTs ? `unix: ${q.openingTs}` : ''}>
                    {q.openingTs ? (
                      <div className="inline-flex items-center gap-2">
                        <span>{new Date(q.openingTs * 1000).toLocaleString()}</span>
                        <button
                          type="button"
                          className="px-2 py-0.5 rounded border border-white/10 bg-white/5 text-white/70 hover:text-white"
                          onClick={async () => { try { await navigator.clipboard.writeText(String(q.openingTs)); } catch {}; setCopiedOpen(q.id); setTimeout(()=> setCopiedOpen(null), 1200); }}
                          title="Copy unix timestamp"
                        >
                          📋 {copiedOpen === q.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    ) : (
                      '-'
                    )}
                  </Td>
                  <Td align="center" className="text-white/60 text-sm" title={deadline ? `unix: ${deadline}` : ''}>
                    {deadline ? (
                      <div className="inline-flex items-center gap-2">
                        <span>{new Date(deadline * 1000).toLocaleString()}</span>
                        <button
                          type="button"
                          className="px-2 py-0.5 rounded border border-white/10 bg-white/5 text-white/70 hover:text-white"
                          onClick={async () => { try { await navigator.clipboard.writeText(String(deadline)); } catch {}; setCopiedDeadline(q.id); setTimeout(()=> setCopiedDeadline(null), 1200); }}
                          title="Copy unix timestamp"
                        >
                          📋 {copiedDeadline === q.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    ) : (
                      '-'
                    )}
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

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/80 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-white/60 text-sm px-4">
            Page {page + 1} of {Math.ceil(total / pageSize)}
          </span>
          <button
            onClick={() => setPage(Math.min(Math.ceil(total / pageSize) - 1, page + 1))}
            disabled={page >= Math.ceil(total / pageSize) - 1}
            className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/80 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
