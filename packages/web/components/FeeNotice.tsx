type Props = {
  feeFormatted: string;
  totalFormatted: string;
  symbol: string;
  feeBps: number;
  feeRecipient: `0x${string}`;
};

export default function FeeNotice({ feeFormatted, totalFormatted, symbol, feeBps, feeRecipient }: Props) {
  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80">
      <div className="flex justify-between">
        <span>Fee ({(feeBps / 100).toFixed(2)}%):</span>
        <span className="font-mono">{feeFormatted} {symbol}</span>
      </div>
      <div className="flex justify-between font-medium">
        <span>Total you pay:</span>
        <span className="font-mono">{totalFormatted} {symbol}</span>
      </div>
      <div className="mt-1 opacity-80">
        This small fee helps fund the developer&apos;s coffee ☕ ({feeRecipient.slice(0, 6)}…{feeRecipient.slice(-4)}).
      </div>
    </div>
  );
}