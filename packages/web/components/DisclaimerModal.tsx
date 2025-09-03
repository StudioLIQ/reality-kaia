"use client";
import { useEffect } from "react";
import { useDisclaimer } from "@/context/DisclaimerContext";

export default function DisclaimerModal() {
  const { isOpen, close, acknowledge, acknowledged } = useDisclaimer();

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { 
      if (e.key === "Escape") close(); 
    };
    if (isOpen) {
      document.addEventListener("keydown", onEsc);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="disclaimer-title-en"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={close} 
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-3xl max-h-[84vh] overflow-auto
                      rounded-2xl border border-white/10 bg-black/95 backdrop-blur-md p-6 shadow-2xl">
        <section id="disclaimer-en" aria-labelledby="disclaimer-title-en" className="space-y-4">
          <h2 id="disclaimer-title-en" className="text-xl font-semibold text-white">
            ⚠️ Disclaimer
          </h2>
          
          <div className="space-y-4 text-sm text-white/90">
            <p>
              This software and the associated smart contracts/web application (the "Service") are provided as a
              <strong className="font-semibold text-amber-400"> personal project</strong> and 
              <strong className="font-semibold text-amber-400"> have not undergone any third-party security audit</strong>.
              The Service is provided <strong className="font-semibold">"AS IS"</strong> and 
              <strong className="font-semibold"> "AS AVAILABLE."</strong>
            </p>
            
            <p>
              The developer <strong className="font-semibold text-amber-400">assumes no liability</strong> for losses arising from use, 
              distribution, forking, or integration of the Service, including but not limited to
              <strong className="font-semibold text-amber-400"> loss of digital assets, price volatility, data corruption, service interruption,
              or regulatory compliance issues</strong>. All risks related to smart-contract vulnerabilities,
              economic attacks, and failures of networks/oracles/wallets/frontends rest with the user.
            </p>
            
            <p>
              Nothing on this site/app constitutes 
              <strong className="font-semibold text-amber-400"> investment, legal, or tax advice</strong>.
              Users are solely responsible for compliance with applicable laws and regulations in their jurisdiction.
              By using the Service, you are deemed to <strong className="font-semibold">agree</strong> to these terms.
            </p>

            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 mt-4">
              <p className="text-amber-300 text-xs">
                <strong>Important:</strong> This is experimental software. Smart contracts can have bugs and vulnerabilities. 
                Never invest more than you can afford to lose. Always verify contract addresses and transactions before proceeding.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button 
            onClick={close} 
            className="px-4 py-2 rounded-lg border border-white/15 hover:bg-white/5 text-sm font-medium transition-colors"
            aria-label="Close disclaimer"
          >
            Close
          </button>
          <button
            onClick={() => { acknowledge(); close(); }}
            className="px-4 py-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20 
                       text-emerald-300 text-sm font-medium transition-colors"
            aria-label={acknowledged ? "Acknowledge and close" : "Acknowledge and don't show again"}
          >
            {acknowledged ? "I understand" : "I understand and won't show again"}
          </button>
        </div>
      </div>
    </div>
  );
}