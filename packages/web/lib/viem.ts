import { createPublicClient, createWalletClient, custom, http } from 'viem'

export const kaiaMainnet = {
  id: 8217,
  name: 'Kaia',
  network: 'kaia',
  nativeCurrency: {
    decimals: 18,
    name: 'KAIA',
    symbol: 'KAIA',
  },
  rpcUrls: {
    default: { http: ['https://public-en.node.kaia.io'] },
    public: { http: ['https://public-en.node.kaia.io'] },
  },
  blockExplorers: {
    default: { name: 'KaiaScope', url: 'https://kaiascan.io' },
  },
} as const

export const kaiaTestnet = {
  id: 1001,
  name: 'Kairos',
  network: 'kairos',
  nativeCurrency: {
    decimals: 18,
    name: 'KAIA',
    symbol: 'KAIA',
  },
  rpcUrls: {
    default: { http: ['https://public-en-kairos.node.kaia.io'] },
    public: { http: ['https://public-en-kairos.node.kaia.io'] },
  },
  blockExplorers: {
    default: { name: 'KaiaScope', url: 'https://kairos.kaiascan.io' },
  },
  testnet: true,
} as const

export const MAINNET_CHAIN_ID = 8217
export const TESTNET_CHAIN_ID = 1001

export const USDT_MAINNET = '0xd077a400968890eacc75cdc901f0356c943e4fdb' as const
export const WKAIA_MAINNET = '0x19Aac5f612f524B754CA7e7c41cbFa2E981A4432' as const
export const WKAIA_TESTNET = '0x043c471bEe060e00A56CcD02c0Ca286808a5A436' as const

export const CHAINS = {
  8217: kaiaMainnet,
  1001: kaiaTestnet,
} as const

export const CHAIN_LABEL = (id: number): string => {
  switch (id) {
    case 8217:
      return 'Mainnet'
    case 1001:
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

