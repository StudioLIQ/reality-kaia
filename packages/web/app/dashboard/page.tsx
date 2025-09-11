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
import { formatAddress, formatDate, formatTokenAmount, getStatusStyle, truncateText, formatNumber, formatDuration } from "@/lib/formatters";

export default function DashboardPage() {
  const { chainId, addr, ready: addrReady, loading: addrLoading, error: addrError } = useAddresses();
  const { total, page, setPage, pageSize, rows: items, loading, err: error } = useOnchainQuestions(20);

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

  // Ensure only one row per unique question ID at the UI layer
  const uniqueRows: QuestionRow[] = useMemo(() => {
    const map = new Map<string, QuestionRow>();
    for (const r of rows) if (!map.has(r.id)) map.set(r.id, r);
    return Array.from(map.values());
  }, [rows]);

  const [filtered, setFiltered] = useState<QuestionRow[]>([]);
  
  // Initialize/sync filtered with current rows when source changes
  useEffect(() => {
    setFiltered(uniqueRows);
  }, [uniqueRows]);
  
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
      <QuestionFilters items={uniqueRows} onChange={handleFilterChange} />

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Total Questions" 
          value={stats.totalQuestions} 
          trend="up" 
          tooltip="Total number of questions in the system"
        />
        <StatCard 
          title="Active Questions" 
          value={stats.openQuestions} 
          meta={<span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Live now
          </span>} 
          tooltip="Questions currently accepting answers"
        />
        <StatCard 
          title="Total Value Locked" 
          value={formatNumber(stats.totalBondValue, { compact: true })} 
          meta={<span>Across all tokens</span>}
          tooltip="Combined value of all bonds"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-white/60 text-lg mb-6">No questions match your current filters</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary"
            >
              Reset Filters
            </button>
            <Link
              href="/create"
              className="btn-primary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Question
            </Link>
          </div>
        </div>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>Question</Th>
              <Th>Status</Th>
              <Th align="right">Current Bond</Th>
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
                    <div className="max-w-md">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-white font-medium leading-relaxed">
                            {truncateText(q.text || q.question || 'Untitled Question', 120)}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            {q.asker && (
                              <span className="text-xs text-white/40 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {formatAddress(q.asker, { short: true })}
                              </span>
                            )}
                            {q.createdAt && (
                              <span className="text-xs text-white/40 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatDate(q.createdAt, { relative: true })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusStyle(status).color}`}>
                      {getStatusStyle(status).icon && <span className="text-sm">{getStatusStyle(status).icon}</span>}
                      {getStatusStyle(status).label}
                    </span>
                  </Td>
                  <Td align="right">
                    <div className="text-sm">
                      {(() => {
                        const raw = q.currentBondRaw as any as bigint | undefined;
                        if (!raw || raw === 0n) {
                          return <span className="text-white/40">No bond yet</span>;
                        }
                        const d = q.bondTokenSymbol === 'USDT' ? 6 : 18;
                        const sym = q.bondTokenSymbol || 'TOKEN';
                        return (
                          <div className="flex flex-col items-end">
                            <span className="text-white font-medium">
                              {formatTokenAmount(raw, d, sym, { compact: true })}
                            </span>
                            {q.bondTokenSymbol && (
                              <span className="text-[10px] text-white/40 uppercase">
                                Min next: {formatTokenAmount(raw * 2n, d, '', { compact: true })}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </Td>
                  <Td align="center">
                    <div className="text-xs">
                      {deadline ? (
                        <div className="flex items-center gap-1">
                          <span className="text-white/40">Deadline:</span>
                          <span className={`${deadline < nowSec ? 'text-red-400' : 'text-white/60'}`}>
                            {formatDate(deadline, { short: true })}
                          </span>
                          {(() => {
                            const remaining = deadline - nowSec;
                            if (remaining === 0) return null;
                            if (remaining > 0) {
                              return (
                                <span className="ml-1 text-white/40">({formatDuration(remaining)} left)</span>
                              );
                            } else {
                              return (
                                <span className="ml-1 text-red-400/80">(overdue by {formatDuration(Math.abs(remaining))})</span>
                              );
                            }
                          })()}
                        </div>
                      ) : (
                        <span className="text-white/40">—</span>
                      )}
                    </div>
                  </Td>
                  <Td align="center">
                    <Link
                      href={`/q/${q.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium transition-all duration-200 hover:scale-105 group"
                    >
                      <span>View Details</span>
                      <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </Td>
                </TRow>
              );
            })}
          </tbody>
        </DataTable>
      )}

      {/* Pagination */}
      {(() => {
        const visibleCount = uniqueRows.length;
        const effectiveTotal = Math.min(total || 0, page * pageSize + visibleCount);
        const pageCount = Math.max(1, Math.ceil((effectiveTotal || 0) / pageSize));
        if (pageCount <= 1) return null;
        return (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/80 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-white/60 text-sm px-4">
            Page {Math.min(page + 1, pageCount)} of {pageCount}
          </span>
          <button
            onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
            disabled={page >= pageCount - 1}
            className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/80 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        );
      })()}
    </div>
  );
}
