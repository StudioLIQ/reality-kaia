export const KAIA_MAINNET_ID = 8217;
export const KAIA_TESTNET_ID = 1001;

export const chainLabel = (id?: number) =>
  id === KAIA_MAINNET_ID ? "Mainnet" :
  id === KAIA_TESTNET_ID ? "Testnet" :
  !id ? "Not Connected" : "Wrong Network";

export type NetStatus = "NOT_CONNECTED" | "WRONG_NETWORK" | "TESTNET" | "MAINNET";

export const networkStatus = (connected: boolean, id?: number): NetStatus => {
  if (!connected) return "NOT_CONNECTED";
  if (id === KAIA_TESTNET_ID) return "TESTNET";
  // Treat mainnet and any other networks as unsupported for now
  return "WRONG_NETWORK";
};
