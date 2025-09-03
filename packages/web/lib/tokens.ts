export type BondToken = { 
  label: 'USDT' | 'WKAIA'; 
  address: `0x${string}`; 
  symbol: string; 
  decimals: number; 
  active: boolean;
};

export const TOKENS_FOR = (chainId: number, deployments: any): BondToken[] => {
  const list: BondToken[] = [];
  
  if (!deployments) return list;
  
  if (chainId === 8217) {
    // Mainnet
    if (deployments.USDT) {
      list.push({ 
        label: 'USDT', 
        address: deployments.USDT, 
        symbol: 'USDT', 
        decimals: 6, 
        active: true 
      });
    }
    if (deployments.WKAIA) {
      list.push({ 
        label: 'WKAIA', 
        address: deployments.WKAIA, 
        symbol: 'WKAIA', 
        decimals: 18, 
        active: true 
      });
    }
  } else if (chainId === 1001) {
    // Testnet
    const usdt = deployments.USDT || deployments.MockUSDT;
    if (usdt) {
      list.push({ 
        label: 'USDT', 
        address: usdt, 
        symbol: 'tUSDT', 
        decimals: 6, 
        active: true 
      });
    }
    if (deployments.WKAIA) {
      list.push({ 
        label: 'WKAIA', 
        address: deployments.WKAIA, 
        symbol: 'WKAIA', 
        decimals: 18, 
        active: true 
      });
    }
  }
  
  return list;
};