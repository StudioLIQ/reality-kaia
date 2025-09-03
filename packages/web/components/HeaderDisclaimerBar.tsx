"use client";
import DisclaimerBadge from "@/components/DisclaimerBadge";

export default function HeaderDisclaimerBar() {
  return (
    <div className="sticky top-14 z-30">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          {/* LEFT: icon + text */}
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="https://cdn.kaiascan.io/nft/mainnet/0x37dafcbc7237c2e063e19439c3775c2e8cda3a80/404/1756888463299_404.avif"
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-6 h-6 md:w-7 md:h-7 rounded-sm object-contain shrink-0"
            />
            <span className="text-sm opacity-70 truncate">
              Please review the disclaimer before using the app.
            </span>
          </div>

          {/* RIGHT: opens full disclaimer modal */}
          <DisclaimerBadge compact />
        </div>
      </div>
    </div>
  );
}