/**
 * Production-ready formatters for displaying user-friendly values
 */

import { formatUnits } from 'viem'

/**
 * Format large numbers with commas and abbreviations
 */
export function formatNumber(value: number | string | bigint, options?: {
  decimals?: number
  compact?: boolean
}): string {
  const num = typeof value === 'bigint' ? Number(value) : Number(value)
  
  if (isNaN(num)) return '0'
  
  if (options?.compact && num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (options?.compact && num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: options?.decimals ?? 2,
  }).format(num)
}

/**
 * Format token amounts with proper decimals and symbol
 */
export function formatTokenAmount(
  amount: bigint | string | number,
  decimals: number = 18,
  symbol?: string,
  options?: {
    compact?: boolean
    showFullPrecision?: boolean
  }
): string {
  const value = typeof amount === 'bigint' 
    ? amount 
    : BigInt(amount)
  
  if (value === 0n) return symbol ? `0 ${symbol}` : '0'
  
  const formatted = formatUnits(value, decimals)
  const num = parseFloat(formatted)
  
  let display: string
  if (options?.showFullPrecision) {
    display = formatted
  } else if (num < 0.01) {
    display = '< 0.01'
  } else if (num < 1) {
    display = num.toFixed(4)
  } else if (num < 100) {
    display = num.toFixed(2)
  } else {
    display = formatNumber(num, { compact: options?.compact })
  }
  
  return symbol ? `${display} ${symbol}` : display
}

/**
 * Format addresses to show first and last characters
 */
export function formatAddress(address: string, options?: {
  short?: boolean
}): string {
  if (!address) return ''
  const chars = options?.short ? 4 : 6
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

/**
 * Format unix timestamp to readable date
 */
export function formatDate(timestamp: number | string, options?: {
  relative?: boolean
  short?: boolean
}): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
  const date = new Date(ts * 1000)
  
  if (options?.relative) {
    const now = Date.now()
    const diff = now - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (seconds < 60) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
  }
  
  if (options?.short) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes} min`
  }
  return `${seconds} sec`
}

/**
 * Format status with appropriate colors and icons
 */
export function getStatusStyle(status: string): {
  color: string
  icon?: string
  label: string
} {
  const statusMap: Record<string, { color: string; icon: string; label: string }> = {
    SCHEDULED: { 
      color: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
      icon: '⏱',
      label: 'Scheduled'
    },
    OPEN: {
      color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30',
      icon: '🟢',
      label: 'Open'
    },
    ANSWERED: {
      color: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
      icon: '⏳',
      label: 'Answered'
    },
    FINALIZED: {
      color: 'bg-white/10 text-white/60 border-white/20',
      icon: '✓',
      label: 'Finalized'
    },
    DISPUTED: {
      color: 'bg-red-400/10 text-red-400 border-red-400/30',
      icon: '⚠',
      label: 'Disputed'
    },
  }
  
  return statusMap[status] || {
    color: 'bg-white/10 text-white/60',
    icon: '',
    label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
  }
}

/**
 * Get human-friendly question type description
 */
export function getQuestionTypeInfo(templateId: number | undefined): {
  type: string
  description: string
  icon: string
} {
  const types: Record<number, { type: string; description: string; icon: string }> = {
    1: { type: 'Yes/No', description: 'Binary true/false question', icon: '🔀' },
    3: { type: 'Multiple Choice', description: 'Select from predefined options', icon: '📝' },
    4: { type: 'Number', description: 'Numeric answer required', icon: '🔢' },
    5: { type: 'Date/Time', description: 'Timestamp answer', icon: '📅' },
    6: { type: 'Text', description: 'Open text response', icon: '💬' },
  }
  
  return types[templateId || 0] || {
    type: 'Custom',
    description: 'Custom question format',
    icon: '❓'
  }
}

/**
 * Format percentage with proper decimals
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}