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

  useEffect(() => { 
    try { 
      setAck(localStorage.getItem(LS_KEY) === "1"); 
    } catch {} 
  }, []);
  
  const acknowledge = () => { 
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