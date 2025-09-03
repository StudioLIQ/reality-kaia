export default function StatCard({
  title, 
  value, 
  meta,
  trend
}: { 
  title: string; 
  value: string | React.ReactNode; 
  meta?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const trendIcon = trend === 'up' ? (
    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  ) : trend === 'down' ? (
    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  ) : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/[0.07] transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm opacity-70">{title}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
          {meta && (
            <div className="mt-2 text-xs opacity-60 flex items-center gap-1">
              {meta}
            </div>
          )}
        </div>
        {trendIcon && (
          <div className="ml-2 mt-1">
            {trendIcon}
          </div>
        )}
      </div>
    </div>
  );
}