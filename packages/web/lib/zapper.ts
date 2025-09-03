import { parseUnits } from "viem";
import type { PublicClient, WalletClient } from "viem";

// Zapper contract ABI for WKAIA integration
export const ZAPPER_ABI = [
  {
    inputs: [
      { name: "token", type: "address" },
      { name: "templateId", type: "uint256" },
      { name: "question", type: "string" },
      { name: "arbitrator", type: "address" },
      { name: "timeout", type: "uint32" },
      { name: "openingTs", type: "uint32" },
      { name: "nonce", type: "uint256" }
    ],
    name: "askQuestionWithKAIA",
    outputs: [{ name: "questionId", type: "bytes32" }],
    stateMutability: "payable",
    type: "function"
  }
] as const;

export interface ZapperParams {
  publicClient: PublicClient | undefined;
  walletClient: WalletClient;
  zapperAddress?: `0x${string}`;
  realitioAddress: `0x${string}`;
  bondToken: `0x${string}`;
  bondAmount: string; // Human-readable amount
  templateId: number;
  question: string;
  arbitrator: `0x${string}`;
  timeout: number;
  openingTs: number;
  nonce: bigint;
  account: `0x${string}`;
}

/**
 * Check if we should use Zapper (when WKAIA is selected and user has native KAIA)
 */
export async function shouldUseZapper(
  bondToken: { label: string; address: `0x${string}` },
  publicClient: PublicClient | undefined,
  address?: `0x${string}`
): Promise<boolean> {
  if (bondToken.label !== 'WKAIA' || !address || !publicClient) return false;
  
  try {
    // Check native KAIA balance
    const balance = await publicClient.getBalance({ address });
    return balance > 0n;
  } catch {
    return false;
  }
}

/**
 * Create question using Zapper (converts native KAIA to WKAIA automatically)
 */
export async function createQuestionWithZapper(params: ZapperParams) {
  const {
    walletClient,
    zapperAddress,
    bondToken,
    bondAmount,
    templateId,
    question,
    arbitrator,
    timeout,
    openingTs,
    nonce,
    account
  } = params;

  if (!zapperAddress) {
    throw new Error("Zapper address not configured");
  }

  // Calculate value to send (native KAIA)
  const value = parseUnits(bondAmount, 18); // KAIA has 18 decimals

  // Call zapper contract
  const hash = await walletClient.writeContract({
    address: zapperAddress,
    abi: ZAPPER_ABI,
    functionName: "askQuestionWithKAIA",
    args: [
      bondToken,
      BigInt(templateId),
      question,
      arbitrator,
      timeout,
      openingTs,
      nonce
    ],
    value, // Send native KAIA
    account,
    chain: null
  } as any);

  return hash;
}