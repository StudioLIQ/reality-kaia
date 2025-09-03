import { formatUnits } from 'viem';

export async function quoteFee({
  client,
  reality,
  bondTokenDecimals,
  bondRaw,
  feeBpsFallback
}: {
  client: any;
  reality: `0x${string}`;
  bondTokenDecimals: number;
  bondRaw: bigint;
  feeBpsFallback: number;
}) {
  try {
    const [fee, total] = await client.readContract({
      address: reality,
      abi: [{
        name: 'feeOn',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: [
          { name: 'fee', type: 'uint256' },
          { name: 'total', type: 'uint256' }
        ]
      }],
      functionName: 'feeOn',
      args: [bondRaw]
    }) as [bigint, bigint];
    
    return {
      fee,
      total,
      feeFormatted: formatUnits(fee, bondTokenDecimals),
      totalFormatted: formatUnits(total, bondTokenDecimals)
    };
  } catch {
    // Fallback calculation if contract call fails
    const fee = (bondRaw * BigInt(feeBpsFallback)) / BigInt(10_000);
    const total = bondRaw + fee;
    
    return {
      fee,
      total,
      feeFormatted: formatUnits(fee, bondTokenDecimals),
      totalFormatted: formatUnits(total, bondTokenDecimals)
    };
  }
}