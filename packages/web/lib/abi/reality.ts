// packages/web/lib/abi/reality.ts
// Minimal Reality ERC20 ABI subset for events used in the app
// Mirrors the LogNewQuestion signature from REALITIO_ABI in contracts.ts
export const realityAbi = [
  {
    type: "event",
    name: "LogNewQuestion",
    inputs: [
      { name: "questionId", type: "bytes32", indexed: true },
      { name: "asker",      type: "address", indexed: true },
      { name: "templateId", type: "uint32",  indexed: false },
      { name: "question",   type: "string",  indexed: false },
      { name: "contentHash",type: "bytes32", indexed: false },
      { name: "arbitrator", type: "address", indexed: false },
      { name: "timeout",    type: "uint32",  indexed: false },
      { name: "openingTs",  type: "uint32",  indexed: false },
      { name: "nonce",      type: "bytes32", indexed: false },
      { name: "createdTs",  type: "uint256", indexed: false }
    ]
  },
] as const;
