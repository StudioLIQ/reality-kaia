"use client";
import { createContext, useContext, useMemo, useState, useEffect, ReactNode } from "react";

type Ctx = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  acknowledged: boolean;
  acknowledge: () => void;
};

const DisclaimerCtx = createContext<Ctx | null>(null);
const LS_KEY = "orakore:disclaimer_ack_v1";

export function DisclaimerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Only access localStorage after mounting on client
    try { 
      const stored = localStorage.getItem(LS_KEY);
      if (stored === "1") {
        setAck(true);
      }
    } catch {} 
  }, []);
  
  const acknowledge = () => { 
    if (!mounted) return;
    try { 
      localStorage.setItem(LS_KEY, "1"); 
    } catch {} 
    setAck(true); 
  };

  const value = useMemo<Ctx>(() => ({
    isOpen, 
    open: () => setOpen(true), 
    close: () => setOpen(false),
    acknowledged: ack, 
    acknowledge,
  }), [isOpen, ack]);

  return <DisclaimerCtx.Provider value={value}>{children}</DisclaimerCtx.Provider>;
}

export function useDisclaimer() {
  const ctx = useContext(DisclaimerCtx);
  if (!ctx) throw new Error("useDisclaimer must be used within DisclaimerProvider");
  return ctx;
}