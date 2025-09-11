"use client";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { deriveStatus, computeDeadline, type QuestionStatus } from "@/lib/status";

export type SortKey = "DEADLINE" | "CREATED" | "BOND";
export type SortDir = "ASC" | "DESC";
export type TokenPick = "ALL" | "USDT" | "WKAIA";

export type QuestionRow = {
  id: string;
  asker?: `0x${string}`;
  user?: `0x${string}`; // fallback if asker not present
  createdAt?: number;          // unix seconds
  createdTs?: number;          // fallback field name
  openingTs?: number;          // unix seconds
  timeoutSec?: number;         // seconds
  timeout?: number;            // fallback field name
  finalized?: boolean;
  isPendingArbitration?: boolean;
  bestAnswer?: string;         // bytes32
  bondToken?: `0x${string}`;  // bond token address
  bondTokenSymbol?: "USDT" | "WKAIA";
  bondTokenAddress?: `0x${string}`;
  bondTokenDecimals?: number;
  currentBondRaw?: bigint;     // current highest bond for the question (raw)
  bestBond?: bigint;           // fallback field name
  text?: string;               // question text
  question?: string;           // fallback field name
  templateId?: number;
};

export default function QuestionFilters({
  items,
  onChange,
}:{
  items: QuestionRow[];
  onChange: (rows: QuestionRow[]) => void;
}) {
  const { address, isConnected } = useAccount();

  // --- filter state
  const [mineOnly, setMineOnly] = useState(false);
  const [statusSet, setStatusSet] = useState<Record<QuestionStatus, boolean>>({
    SCHEDULED: true, OPEN: true, ANSWERED: true, FINALIZED: true, DISPUTED: true,
  });
  const [tokenPick, setTokenPick] = useState<TokenPick>("ALL");
  const [filterAddress, setFilterAddress] = useState<string>("");

  // --- sort state
  const [sortKey, setSortKey] = useState<SortKey>("DEADLINE");
  const [sortDir, setSortDir] = useState<SortDir>("DESC");

  const nowSec = Math.floor(Date.now() / 1000);

  const filtered = useMemo(() => {
    let rows = items.slice();

    // Asker address filter (optional)
    if (filterAddress.trim()) {
      const target = filterAddress.trim().toLowerCase();
      rows = rows.filter(r => (r.asker || r.user || "").toLowerCase() === target);
    }

    // Mine only
    if (mineOnly && isConnected && address) {
      const a = address.toLowerCase();
      rows = rows.filter(r => {
        const asker = (r.asker || r.user || "").toLowerCase();
        return asker === a;
      });
    }

    // Token filter
    if (tokenPick !== "ALL") {
      rows = rows.filter(r => {
        // Try to determine token type from symbol or address
        const symbol = r.bondTokenSymbol?.toUpperCase();
        if (symbol) return symbol === tokenPick;
        
        // Check by address if symbol not available
        const tokenAddr = (r.bondToken || r.bondTokenAddress || "").toLowerCase();
        // You might need to adjust these addresses for your deployment
        if (tokenPick === "USDT" && tokenAddr.includes("ceaa")) return true;
        if (tokenPick === "WKAIA" && tokenAddr === "0x0000000000000000000000000000000000000000") return true;
        return false;
      });
    }

    // Status filter
    rows = rows.filter(r => statusSet[deriveStatus(r, nowSec)]);

    return rows;
  }, [items, mineOnly, isConnected, address, tokenPick, statusSet, nowSec]);

  const sorted = useMemo(() => {
    const rows = filtered.slice();
    const cmp = (a: QuestionRow, b: QuestionRow) => {
      let va = 0, vb = 0;
      if (sortKey === "DEADLINE") {
        va = computeDeadline(a) || 0; vb = computeDeadline(b) || 0;
      } else if (sortKey === "CREATED") {
        va = Number(a.createdAt || a.createdTs || 0); 
        vb = Number(b.createdAt || b.createdTs || 0);
      } else { // BOND
        // If tokenPick is ALL, disable bond sort by treating as 0
        const aa = a.currentBondRaw || a.bestBond ? Number(a.currentBondRaw || a.bestBond) : 0;
        const bb = b.currentBondRaw || b.bestBond ? Number(b.currentBondRaw || b.bestBond) : 0;
        va = aa; vb = bb;
      }
      return sortDir === "ASC" ? va - vb : vb - va;
    };
    rows.sort(cmp);
    return rows;
  }, [filtered, sortKey, sortDir]);

  useEffect(() => { 
    onChange(sorted); 
  }, [sorted, onChange]);

  const toggleStatus = (s: QuestionStatus) =>
    setStatusSet(prev => ({ ...prev, [s]: !prev[s] }));

  const Chip = ({ active, onClick, children, count }:{
    active: boolean; onClick: () => void; children: React.ReactNode; count?: number;
  }) => (
    <button
      onClick={onClick}
      className={`group px-3 py-1.5 rounded-full border transition-all duration-200 text-sm flex items-center gap-1.5 ${
        active 
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-lg shadow-emerald-400/10" 
          : "border-white/10 text-white/60 hover:bg-white/5 hover:text-white hover:border-white/20"
      }`}
    >
      {children}
      {count !== undefined && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          active ? "bg-emerald-400/20" : "bg-white/10"
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  const Select = (props: any) => (
    <select {...props}
      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-400/50 cursor-pointer hover:bg-white/10 transition-colors">
      {props.children}
    </select>
  );

  // Count questions by status
  const statusCounts = useMemo(() => {
    const counts: Record<QuestionStatus, number> = {
      SCHEDULED: 0, OPEN: 0, ANSWERED: 0, FINALIZED: 0, DISPUTED: 0
    };
    items.forEach(item => {
      const status = deriveStatus(item, nowSec);
      counts[status]++;
    });
    return counts;
  }, [items, nowSec]);

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
          <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
        </h3>
        <span className="text-xs text-white/40">{filtered.length} of {items.length} questions</span>
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        {/* Mine only */}
        {isConnected && (
          <Chip
            active={mineOnly}
            onClick={() => setMineOnly(v => !v)}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            My Questions
          </Chip>
        )}

        {/* Status chips */}
        <div className="flex flex-wrap gap-2">
          <Chip active={statusSet.SCHEDULED} onClick={() => toggleStatus("SCHEDULED")} count={statusCounts.SCHEDULED}>
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Scheduled
          </Chip>
          <Chip active={statusSet.OPEN} onClick={() => toggleStatus("OPEN")} count={statusCounts.OPEN}>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Open
          </Chip>
          <Chip active={statusSet.ANSWERED} onClick={() => toggleStatus("ANSWERED")} count={statusCounts.ANSWERED}>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Answered
          </Chip>
          <Chip active={statusSet.FINALIZED} onClick={() => toggleStatus("FINALIZED")} count={statusCounts.FINALIZED}>
            <span className="w-2 h-2 rounded-full bg-white/60" />
            Finalized
          </Chip>
          <Chip active={statusSet.DISPUTED} onClick={() => toggleStatus("DISPUTED")} count={statusCounts.DISPUTED}>
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Disputed
          </Chip>
        </div>

      </div>
      
      {/* Advanced filters section */}
      <div className="pt-3 border-t border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          {/* Asker filter */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <input
              value={filterAddress}
              onChange={(e)=> setFilterAddress(e.target.value)}
              placeholder="Filter by wallet address..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/50 focus:bg-white/10 transition-all"
            />
          </div>
          
          {/* Token picker */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <Select value={tokenPick} onChange={(e:any)=> setTokenPick(e.target.value as TokenPick)}>
              <option value="ALL">All Tokens</option>
              <option value="USDT">USDT Only</option>
              <option value="WKAIA">WKAIA Only</option>
            </Select>
          </div>

          {/* Sort controls */}
          <div className="flex items-center gap-2 ml-auto">
            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4 4m0 0l4-4m-4 4V8" />
            </svg>
            <Select
              value={sortKey}
              onChange={(e:any)=> setSortKey(e.target.value as SortKey)}
            >
              <option value="DEADLINE">Sort by Deadline</option>
              <option value="CREATED">Sort by Creation</option>
              <option value="BOND" disabled={tokenPick==="ALL"}>
                Sort by Bond{tokenPick==="ALL" ? " (select token first)" : ""}
              </option>
            </Select>
            <button
              onClick={() => setSortDir(d => d === "ASC" ? "DESC" : "ASC")}
              className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
              aria-label={`Sort ${sortDir === "ASC" ? "descending" : "ascending"}`}
            >
              {sortDir === "DESC" ? (
                <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {sortKey==="BOND" && tokenPick==="ALL" && (
        <div className="flex items-center gap-2 text-xs text-amber-300/80 bg-amber-400/10 rounded-lg px-3 py-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Select a specific token to enable sorting by bond amount</span>
        </div>
      )}
    </div>
  );
}
