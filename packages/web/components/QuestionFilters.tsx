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

  const Chip = ({ active, onClick, children }:{
    active: boolean; onClick: () => void; children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border transition text-sm ${
        active 
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" 
          : "border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
      }`}
    >
      {children}
    </button>
  );

  const Select = (props: any) => (
    <select {...props}
      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-400/50">
      {props.children}
    </select>
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Mine only */}
        {isConnected && (
          <Chip
            active={mineOnly}
            onClick={() => setMineOnly(v => !v)}
          >
            My Questions
          </Chip>
        )}

        {/* Status chips */}
        <div className="flex flex-wrap gap-2">
          <Chip active={statusSet.SCHEDULED} onClick={() => toggleStatus("SCHEDULED")}>Scheduled</Chip>
          <Chip active={statusSet.OPEN}       onClick={() => toggleStatus("OPEN")}>Open</Chip>
          <Chip active={statusSet.ANSWERED}   onClick={() => toggleStatus("ANSWERED")}>Answered</Chip>
          <Chip active={statusSet.FINALIZED}  onClick={() => toggleStatus("FINALIZED")}>Finalized</Chip>
          <Chip active={statusSet.DISPUTED}   onClick={() => toggleStatus("DISPUTED")}>Disputed</Chip>
        </div>

        {/* Right side controls */}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Asker filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Asker</span>
            <input
              value={filterAddress}
              onChange={(e)=> setFilterAddress(e.target.value)}
              placeholder="0x..."
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-400/50 w-48"
            />
          </div>
          {/* Token picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Token</span>
            <Select value={tokenPick} onChange={(e:any)=> setTokenPick(e.target.value as TokenPick)}>
              <option value="ALL">All</option>
              <option value="USDT">USDT</option>
              <option value="WKAIA">WKAIA</option>
            </Select>
          </div>

          {/* Sort key */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Sort</span>
            <Select
              value={sortKey}
              onChange={(e:any)=> setSortKey(e.target.value as SortKey)}
            >
              <option value="DEADLINE">Deadline</option>
              <option value="CREATED">Created</option>
              <option value="BOND" disabled={tokenPick==="ALL"}>
                Bond{tokenPick==="ALL" ? " (select token)" : ""}
              </option>
            </Select>
          </div>

          {/* Sort dir */}
          <Select value={sortDir} onChange={(e:any)=> setSortDir(e.target.value as SortDir)}>
            <option value="DESC">↓ Desc</option>
            <option value="ASC">↑ Asc</option>
          </Select>
        </div>
      </div>
      
      {sortKey==="BOND" && tokenPick==="ALL" && (
        <div className="text-xs text-amber-300/80 bg-amber-400/10 rounded-lg px-3 py-2">
          Select a specific token (USDT or WKAIA) to enable bond amount sorting.
        </div>
      )}
    </div>
  );
}
