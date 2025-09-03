export type BondToken = { 
  label: 'USDT' | 'WKAIA'; 
  address: `0x${string}`; 
  symbol: string; 
  decimals: number; 
  active: boolean;
};

export type TokenMeta = {
  symbol: 'USDT' | 'WKAIA';
  address: `0x${string}`;
  decimals: 6 | 18;
};

// Helper to load token metadata with env fallbacks
export async function loadTokenMeta(): Promise<Record<'USDT'|'WKAIA', TokenMeta> | null> {
  // Check for environment variables as fallback
  const usdtEnv = process.env.NEXT_PUBLIC_USDT_ADDRESS;
  const wkaiaEnv = process.env.NEXT_PUBLIC_WKAIA_ADDRESS;
  
  if (usdtEnv && wkaiaEnv) {
    return {
      USDT: { symbol: 'USDT', address: usdtEnv as `0x${string}`, decimals: 6 },
      WKAIA: { symbol: 'WKAIA', address: wkaiaEnv as `0x${string}`, decimals: 18 },
    };
  }
  
  return null; // Deployments will be used as primary source
}

export const TOKENS_FOR = (chainId: number, deployments: any): BondToken[] => {
  const list: BondToken[] = [];
  
  if (!deployments) return list;
  
  // Try to get addresses from deployments first, then env variables as fallback
  const usdtAddress = deployments.USDT || deployments.MockUSDT || process.env.NEXT_PUBLIC_USDT_ADDRESS;
  const wkaiaAddress = deployments.WKAIA || process.env.NEXT_PUBLIC_WKAIA_ADDRESS;
  
  if (chainId === 8217) {
    // Mainnet
    if (usdtAddress) {
      list.push({ 
        label: 'USDT', 
        address: usdtAddress as `0x${string}`, 
        symbol: 'USDT', 
        decimals: 6, 
        active: true 
      });
    }
    if (wkaiaAddress) {
      list.push({ 
        label: 'WKAIA', 
        address: wkaiaAddress as `0x${string}`, 
        symbol: 'WKAIA', 
        decimals: 18, 
        active: true 
      });
    }
  } else if (chainId === 1001) {
    // Testnet
    if (usdtAddress) {
      list.push({ 
        label: 'USDT', 
        address: usdtAddress as `0x${string}`, 
        symbol: 'tUSDT', 
        decimals: 6, 
        active: true 
      });
    }
    if (wkaiaAddress) {
      list.push({ 
        label: 'WKAIA', 
        address: wkaiaAddress as `0x${string}`, 
        symbol: 'WKAIA', 
        decimals: 18, 
        active: true 
      });
    }
  }
  
  // If no tokens were added and we're on a supported chain, show a warning
  if (list.length === 0 && (chainId === 8217 || chainId === 1001)) {
    console.warn(`No token addresses configured for chain ${chainId}. Please set NEXT_PUBLIC_USDT_ADDRESS and NEXT_PUBLIC_WKAIA_ADDRESS in your .env file or ensure deployments are loaded.`);
  }
  
  return list;
};