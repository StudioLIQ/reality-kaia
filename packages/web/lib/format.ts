/**
 * Formatting utilities for addresses, numbers, and display values
 */

/**
 * Shortens an address to 0x1234...5678 format
 */
export function shortAddress(address?: `0x${string}`): string {
  if (!address) return '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Formats a number with thousand separators
 */
export function formatNumber(value: number | bigint): string {
  return new Intl.NumberFormat('en-US').format(Number(value));
}

/**
 * Formats a token amount with proper decimals
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  maxDecimals = 4
): string {
  const divisor = 10n ** BigInt(decimals);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;
  
  if (fractionalPart === 0n) {
    return formatNumber(wholePart);
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmed = fractionalStr.slice(0, maxDecimals).replace(/0+$/, '');
  
  if (!trimmed) {
    return formatNumber(wholePart);
  }
  
  return `${formatNumber(wholePart)}.${trimmed}`;
}