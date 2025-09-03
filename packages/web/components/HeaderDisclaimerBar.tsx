"use client";
import DisclaimerBadge from "@/components/DisclaimerBadge";

export default function HeaderDisclaimerBar() {
  // Header height ~= 56px (h-14). Stick just under it.
  return (
    <div className="sticky top-14 z-30">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <span className="text-sm opacity-70">Please review the disclaimer before using the app.</span>
          <DisclaimerBadge compact />
        </div>
      </div>
    </div>
  );
}