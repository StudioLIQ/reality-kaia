import { formatNumber } from '@/lib/formatters';

export default function StatCard({
  title, 
  value, 
  meta,
  trend,
  loading = false,
  tooltip
}: { 
  title: string; 
  value: string | number | React.ReactNode; 
  meta?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
  tooltip?: string;
}) {
  const trendIcon = trend === 'up' ? (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-400/10">
      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </div>
  ) : trend === 'down' ? (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-400/10">
      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </div>
  ) : null;

  const displayValue = typeof value === 'number' ? formatNumber(value) : value;

  return (
    <div className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5 hover:from-white/[0.08] hover:to-white/[0.04] transition-all duration-300 hover:scale-[1.02] hover:border-white/20">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60 font-medium">{title}</span>
            {tooltip && (
              <div className="group/tooltip relative">
                <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center cursor-help">
                  <span className="text-[10px] text-white/40">?</span>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 border border-white/10 rounded text-xs text-white/80 whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-10">
                  {tooltip}
                </div>
              </div>
            )}
          </div>
          {loading ? (
            <div className="mt-2 h-8 bg-white/5 rounded animate-pulse" />
          ) : (
            <div className="mt-2 text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              {displayValue}
            </div>
          )}
          {meta && (
            <div className="mt-3 text-xs text-white/40 flex items-center gap-1">
              {meta}
            </div>
          )}
        </div>
        {trendIcon && (
          <div className="ml-3">
            {trendIcon}
          </div>
        )}
      </div>
    </div>
  );
}