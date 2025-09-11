import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { KAIA_TESTNET_ID } from './chain'

export const kaiaTestnet = {
  id: KAIA_TESTNET_ID,
  name: 'Kaia Kairos',
  nativeCurrency: {
    decimals: 18,
    name: 'KAIA',
    symbol: 'KAIA',
  },
  rpcUrls: {
    default: { 
      http: [process.env.NEXT_PUBLIC_RPC_TESTNET || 'https://public-en-kairos.node.kaia.io'] 
    },
  },
  blockExplorers: {
    default: { name: 'KaiaScope', url: 'https://kairos.kaiascan.io' },
  },
  testnet: true,
} as const

export const config = createConfig({
  chains: [kaiaTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [KAIA_TESTNET_ID]: http(process.env.NEXT_PUBLIC_RPC_TESTNET || 'https://public-en-kairos.node.kaia.io'),
  },
  ssr: true,
})
