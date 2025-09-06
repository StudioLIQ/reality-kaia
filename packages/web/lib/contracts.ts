import { USDT_MAINNET, WKAIA_MAINNET, WKAIA_TESTNET, type Addr } from './viem'
import { getDeployments } from './deployments.generated'

export const REALITIO_ABI = [
  {
    "inputs": [
      { "internalType": "uint32", "name": "templateId", "type": "uint32" },
      { "internalType": "string", "name": "question", "type": "string" },
      { "internalType": "address", "name": "arbitrator", "type": "address" },
      { "internalType": "uint32", "name": "timeout", "type": "uint32" },
      { "internalType": "uint32", "name": "openingTs", "type": "uint32" },
      { "internalType": "bytes32", "name": "nonce", "type": "bytes32" }
    ],
    "name": "askQuestion",
    "outputs": [{ "internalType": "bytes32", "name": "questionId", "type": "bytes32" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "questionId", "type": "bytes32" },
      { "internalType": "bytes32", "name": "answer", "type": "bytes32" },
      { "internalType": "uint256", "name": "bond", "type": "uint256" }
    ],
    "name": "submitAnswer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "questionId", "type": "bytes32" },
      { "internalType": "bytes32", "name": "answer", "type": "bytes32" },
      { "internalType": "uint256", "name": "bond", "type": "uint256" },
      { "internalType": "address", "name": "bondToken", "type": "address" }
    ],
    "name": "submitAnswerWithToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "questionId", "type": "bytes32" },
      { "internalType": "bytes32", "name": "answerHash", "type": "bytes32" },
      { "internalType": "uint256", "name": "bond", "type": "uint256" }
    ],
    "name": "submitAnswerCommitment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "questionId", "type": "bytes32" },
      { "internalType": "bytes32", "name": "answer", "type": "bytes32" },
      { "internalType": "uint256", "name": "bond", "type": "uint256" },
      {
        "components": [
          {
            "components": [
              { "internalType": "address", "name": "token", "type": "address" },
              { "internalType": "uint256", "name": "amount", "type": "uint256" }
            ],
            "internalType": "struct ISignatureTransfer.TokenPermissions",
            "name": "permitted",
            "type": "tuple"
          },
          { "internalType": "uint256", "name": "nonce", "type": "uint256" },
          { "internalType": "uint256", "name": "deadline", "type": "uint256" }
        ],
        "internalType": "struct ISignatureTransfer.PermitTransferFrom",
        "name": "permit",
        "type": "tuple"
      },
      { "internalType": "bytes", "name": "signature", "type": "bytes" },
      { "internalType": "address", "name": "bondToken", "type": "address" }
    ],
    "name": "submitAnswerWithPermit2",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "questionId", "type": "bytes32" },
      { "internalType": "bytes32", "name": "answerHash", "type": "bytes32" },
      { "internalType": "uint256", "name": "bond", "type": "uint256" },
      {
        "components": [
          {
            "components": [
              { "internalType": "address", "name": "token", "type": "address" },
              { "internalType": "uint256", "name": "amount", "type": "uint256" }
            ],
            "internalType": "struct ISignatureTransfer.TokenPermissions",
            "name": "permitted",
            "type": "tuple"
          },
          { "internalType": "uint256", "name": "nonce", "type": "uint256" },
          { "internalType": "uint256", "name": "deadline", "type": "uint256" }
        ],
        "internalType": "struct ISignatureTransfer.PermitTransferFrom",
        "name": "permit",
        "type": "tuple"
      },
      { "internalType": "bytes", "name": "signature", "type": "bytes" },
      { "internalType": "address", "name": "bondToken", "type": "address" }
    ],
    "name": "submitAnswerCommitmentWithPermit2",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "questionId", "type": "bytes32" },
      { "internalType": "bytes32", "name": "answer", "type": "bytes32" },
      { "internalType": "uint256", "name": "bond", "type": "uint256" },
      { "internalType": "address", "name": "bondToken", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" },
      { "internalType": "uint8", "name": "v", "type": "uint8" },
      { "internalType": "bytes32", "name": "r", "type": "bytes32" },
      { "internalType": "bytes32", "name": "s", "type": "bytes32" }
    ],
    "name": "submitAnswerWithPermit2612",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "questionId", "type": "bytes32" },
      { "internalType": "bytes32", "name": "answerHash", "type": "bytes32" },
      { "internalType": "uint256", "name": "bond", "type": "uint256" },
      { "internalType": "address", "name": "bondToken", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" },
      { "internalType": "uint8", "name": "v", "type": "uint8" },
      { "internalType": "bytes32", "name": "r", "type": "bytes32" },
      { "internalType": "bytes32", "name": "s", "type": "bytes32" }
    ],
    "name": "submitAnswerCommitmentWithPermit2612",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "questionId", "type": "bytes32" },
      { "internalType": "bytes32", "name": "answer", "type": "bytes32" },
      { "internalType": "bytes32", "name": "nonce", "type": "bytes32" }
    ],
    "name": "revealAnswer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "questionId", "type": "bytes32" }],
    "name": "finalize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "questionId", "type": "bytes32" }],
    "name": "resultFor",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "questionId", "type": "bytes32" }],
    "name": "getQuestion",
    "outputs": [
      { "internalType": "address", "name": "arbitrator", "type": "address" },
      { "internalType": "address", "name": "bondToken", "type": "address" },
      { "internalType": "uint32", "name": "timeout", "type": "uint32" },
      { "internalType": "uint32", "name": "openingTs", "type": "uint32" },
      { "internalType": "bytes32", "name": "contentHash", "type": "bytes32" },
      { "internalType": "bytes32", "name": "bestAnswer", "type": "bytes32" },
      { "internalType": "uint256", "name": "bestBond", "type": "uint256" },
      { "internalType": "address", "name": "bestAnswerer", "type": "address" },
      { "internalType": "uint64", "name": "lastAnswerTs", "type": "uint64" },
      { "internalType": "bool", "name": "finalized", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "questionId", "type": "bytes32" },
      { "indexed": true, "internalType": "address", "name": "asker", "type": "address" },
      { "indexed": false, "internalType": "uint32", "name": "templateId", "type": "uint32" },
      { "indexed": false, "internalType": "string", "name": "question", "type": "string" },
      { "indexed": false, "internalType": "bytes32", "name": "contentHash", "type": "bytes32" },
      { "indexed": false, "internalType": "address", "name": "arbitrator", "type": "address" },
      { "indexed": false, "internalType": "uint32", "name": "timeout", "type": "uint32" },
      { "indexed": false, "internalType": "uint32", "name": "openingTs", "type": "uint32" },
      { "indexed": false, "internalType": "bytes32", "name": "nonce", "type": "bytes32" },
      { "indexed": false, "internalType": "uint256", "name": "createdTs", "type": "uint256" }
    ],
    "name": "LogNewQuestion",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "questionId", "type": "bytes32" },
      { "indexed": true, "internalType": "bytes32", "name": "answer", "type": "bytes32" },
      { "indexed": true, "internalType": "address", "name": "answerer", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "bond", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "ts", "type": "uint256" }
    ],
    "name": "LogNewAnswer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "questionId", "type": "bytes32" },
      { "indexed": true, "internalType": "bytes32", "name": "answer", "type": "bytes32" }
    ],
    "name": "LogFinalize",
    "type": "event"
  }
] as const

export const ERC20_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export const REALITIO_ERC20_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_feeRecipient", "type": "address" },
      { "internalType": "uint16", "name": "_feeBps", "type": "uint16" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "bondToken", "type": "address" },
      { "internalType": "uint32", "name": "templateId", "type": "uint32" },
      { "internalType": "string", "name": "question", "type": "string" },
      { "internalType": "address", "name": "arbitrator", "type": "address" },
      { "internalType": "uint32", "name": "timeout", "type": "uint32" },
      { "internalType": "uint32", "name": "openingTs", "type": "uint32" },
      { "internalType": "bytes32", "name": "nonce", "type": "bytes32" }
    ],
    "name": "askQuestionERC20",
    "outputs": [{ "internalType": "bytes32", "name": "questionId", "type": "bytes32" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "feeOn",
    "outputs": [
      { "internalType": "uint256", "name": "fee", "type": "uint256" },
      { "internalType": "uint256", "name": "total", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "feeInfo",
    "outputs": [
      { "internalType": "uint16", "name": "", "type": "uint16" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "questionId", "type": "bytes32" }],
    "name": "bondTokenOf",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  ...REALITIO_ABI.slice(1)
] as const

export interface BondToken {
  label: string
  address: Addr
  symbol: string
  decimals: number
}

export function resolveBondTokens(chainId: number, deployments: any): BondToken[] {
  const TOKENS: BondToken[] = []
  
  if (chainId === 8217) {
    TOKENS.push({ 
      label: 'USDT', 
      address: USDT_MAINNET, 
      symbol: 'USDT', 
      decimals: 6 
    })
    TOKENS.push({ 
      label: 'WKAIA', 
      address: WKAIA_MAINNET, 
      symbol: 'WKAIA', 
      decimals: 18 
    })
  } else if (chainId === 1001) {
    const usdtLike = deployments?.USDT || deployments?.MockUSDT
    if (usdtLike) {
      TOKENS.push({ 
        label: 'USDT', 
        address: usdtLike as Addr, 
        symbol: 'USDT', 
        decimals: 6 
      })
    }
    TOKENS.push({ 
      label: 'WKAIA', 
      address: WKAIA_TESTNET, 
      symbol: 'WKAIA', 
      decimals: 18 
    })
  }
  
  return TOKENS
}

export async function getDeploymentsFromApi(chainId: number): Promise<any | null> {
  try {
    const response = await fetch(`/api/deployments/${chainId}`)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

export function calculateFee(bondAmount: bigint, feeBps: number = 25): { fee: bigint; total: bigint } {
  const fee = (bondAmount * BigInt(feeBps)) / BigInt(10000)
  const total = bondAmount + fee
  return { fee, total }
}

export async function getDeployedAddresses(chainId: number): Promise<{
  realitioERC20: string
  arbitratorSimple: string
} | null> {
  try {
    const response = await fetch(`/api/deployments/${chainId}`)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

export async function resolveBondTokensWithStatus(
  client: any, 
  chainId: number, 
  deployments: any, 
  realityAddr: `0x${string}`
) {
  const base = chainId === 8217
    ? [
        {label:'USDT',  address: deployments.USDT as `0x${string}`,  symbol:'USDT',  decimals:6},
        {label:'WKAIA', address: deployments.WKAIA as `0x${string}`, symbol:'WKAIA', decimals:18}
      ]
    : [
        {label:'USDT',  address: (deployments.USDT ?? deployments.MockUSDT) as `0x${string}`, symbol:'USDT', decimals:6},
        {label:'WKAIA', address: deployments.WKAIA as `0x${string}`, symbol:'WKAIA', decimals:18}
      ];

  const abiAllowed = [
    { name:'allowedBondToken', type:'function', stateMutability:'view', inputs:[{name:'',type:'address'}], outputs:[{type:'bool'}] },
    { name:'isAllowedBondToken', type:'function', stateMutability:'view', inputs:[{name:'token',type:'address'}], outputs:[{type:'bool'}] },
  ];

  const out = [];
  for (const t of base) {
    if (!t.address) continue; // skip if address is missing
    
    let active = true;
    try {
      active = await client.readContract({ 
        address: realityAddr, 
        abi: [abiAllowed[0]], 
        functionName:'allowedBondToken', 
        args:[t.address] 
      });
    } catch(_) {
      try {
        active = await client.readContract({ 
          address: realityAddr, 
          abi: [abiAllowed[1]], 
          functionName:'isAllowedBondToken', 
          args:[t.address] 
        });
      } catch { 
        active = true; // default to active if no check method exists
      }
    }
    out.push({...t, active});
  }
  return out;
}

export interface DeploymentAddresses {
  realitioERC20: string;
  arbitratorSimple: string;
  zapperWKAIA: string;
  feeRecipient: string;
  feeBps: number;
  WKAIA: string;
  USDT?: string;
  MockUSDT?: string;
  deployer: string;
}

export function loadAddresses(chainId: number): DeploymentAddresses | undefined {
  const deployments = getDeployments(chainId);
  if (!deployments) return undefined;

  return {
    realitioERC20: deployments.realitioERC20,
    arbitratorSimple: deployments.arbitratorSimple,
    zapperWKAIA: deployments.zapperWKAIA,
    feeRecipient: deployments.feeRecipient,
    feeBps: deployments.feeBps,
    WKAIA: deployments.WKAIA,
    USDT: deployments.USDT,
    MockUSDT: deployments.MockUSDT,
    deployer: deployments.deployer,
  };
}
