/**
 * Permit2 typed data builders
 */

import type { Address } from "viem";

export interface PermitSingle {
  details: {
    token: Address;
    amount: bigint;
    expiration: bigint;
    nonce: bigint;
  };
  spender: Address;
  sigDeadline: bigint;
}

export interface PermitTransferFrom {
  permitted: {
    token: Address;
    amount: bigint;
  };
  spender: Address;
  nonce: bigint;
  deadline: bigint;
}

export const PERMIT2_DOMAIN = {
  name: "Permit2",
  chainId: 0, // Set at runtime
  verifyingContract: "0x" as Address, // Set at runtime
} as const;

export const PERMIT_SINGLE_TYPE = {
  PermitSingle: [
    { name: "details", type: "PermitDetails" },
    { name: "spender", type: "address" },
    { name: "sigDeadline", type: "uint256" },
  ],
  PermitDetails: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint160" },
    { name: "expiration", type: "uint48" },
    { name: "nonce", type: "uint48" },
  ],
} as const;

export const PERMIT_TRANSFER_FROM_TYPE = {
  PermitTransferFrom: [
    { name: "permitted", type: "TokenPermissions" },
    { name: "spender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  TokenPermissions: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
  ],
} as const;

/**
 * Creates permit2 domain with proper chain ID
 */
export function createPermit2Domain(chainId: number, permit2Address: Address) {
  return {
    ...PERMIT2_DOMAIN,
    chainId,
    verifyingContract: permit2Address,
  };
}

/**
 * Creates a permit single message
 */
export function createPermitSingle(
  token: Address,
  amount: bigint,
  spender: Address,
  nonce: bigint,
  sigDeadline: bigint,
  expiration?: bigint
): PermitSingle {
  return {
    details: {
      token,
      amount,
      expiration: expiration ?? sigDeadline,
      nonce,
    },
    spender,
    sigDeadline,
  };
}

/**
 * Creates a permit transfer from message
 */
export function createPermitTransferFrom(
  token: Address,
  amount: bigint,
  spender: Address,
  nonce: bigint,
  deadline: bigint
): PermitTransferFrom {
  return {
    permitted: {
      token,
      amount,
    },
    spender,
    nonce,
    deadline,
  };
}