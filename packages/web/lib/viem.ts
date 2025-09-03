import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { KAIA_MAINNET_ID, KAIA_TESTNET_ID } from './chain'

export const kaiaMainnet = {
  id: KAIA_MAINNET_ID,
  name: 'Kaia',
  network: 'kaia',
  nativeCurrency: {
    decimals: 18,
    name: 'KAIA',
    symbol: 'KAIA',
  },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_MAINNET || 'https://public-en.node.kaia.io'] },
    public: { http: [process.env.NEXT_PUBLIC_RPC_MAINNET || 'https://public-en.node.kaia.io'] },
  },
  blockExplorers: {
    default: { name: 'KaiaScope', url: 'https://kaiascan.io' },
  },
} as const

export const kaiaTestnet = {
  id: KAIA_TESTNET_ID,
  name: 'Kairos',
  network: 'kairos',
  nativeCurrency: {
    decimals: 18,
    name: 'KAIA',
    symbol: 'KAIA',
  },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_TESTNET || 'https://public-en-kairos.node.kaia.io'] },
    public: { http: [process.env.NEXT_PUBLIC_RPC_TESTNET || 'https://public-en-kairos.node.kaia.io'] },
  },
  blockExplorers: {
    default: { name: 'KaiaScope', url: 'https://kairos.kaiascan.io' },
  },
  testnet: true,
} as const

export const MAINNET_CHAIN_ID = KAIA_MAINNET_ID
export const TESTNET_CHAIN_ID = KAIA_TESTNET_ID

export const USDT_MAINNET = '0xd077a400968890eacc75cdc901f0356c943e4fdb' as const
export const WKAIA_MAINNET = '0x19Aac5f612f524B754CA7e7c41cbFa2E981A4432' as const
export const WKAIA_TESTNET = '0x043c471bEe060e00A56CcD02c0Ca286808a5A436' as const

export const CHAINS = {
  [KAIA_MAINNET_ID]: kaiaMainnet,
  [KAIA_TESTNET_ID]: kaiaTestnet,
} as const

export const CHAIN_LABEL = (id: number): string => {
  switch (id) {
    case KAIA_MAINNET_ID:
      return 'Mainnet'
    case KAIA_TESTNET_ID:
      return 'Testnet'
    default:
      return `Chain ${id}`
  }
}

export type Addr = `0x${string}`

export function getPublicClient(chainId: number) {
  const chain = chainId === 8217 ? kaiaMainnet : kaiaTestnet
  return createPublicClient({
    chain,
    transport: http(),
  })
}

export function getWalletClient(chainId: number) {
  const chain = chainId === 8217 ? kaiaMainnet : kaiaTestnet
  return createWalletClient({
    chain,
    transport: custom(window.ethereum!),
  })
}

