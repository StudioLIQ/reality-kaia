export function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {children}
        </table>
      </div>
    </div>
  );
}

export function Th({ 
  children, 
  align = 'left',
  className = '',
}: { 
  children: React.ReactNode; 
  align?: 'left' | 'center' | 'right';
  className?: string;
}) {
  return (
    <th scope="col" className={`bg-white/[0.04] px-4 py-3 font-medium text-white/80 text-${align} ${className}`}>
      {children}
    </th>
  );
}

export function Td({ 
  children, 
  align = 'left',
  className = ''
}: { 
  children: React.ReactNode; 
  align?: 'left' | 'center' | 'right';
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 border-t border-white/5 text-${align} ${className}`}>
      {children}
    </td>
  );
}

export function TRow({ 
  children, 
  onClick,
  className = ''
}: { 
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr 
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`${onClick ? 'hover:bg-white/[0.03] active:bg-white/[0.06] focus:bg-white/[0.06] cursor-pointer outline-none' : ''} transition-colors ${className}`}
    >
      {children}
    </tr>
  );
}
