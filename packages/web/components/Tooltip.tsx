"use client";
import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export default function Tooltip({ 
  content, 
  children, 
  position = 'top',
  delay = 200
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      updatePosition();
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    let x = 0;
    let y = 0;
    
    switch (position) {
      case 'top':
        x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        y = triggerRect.top - tooltipRect.height - 8;
        break;
      case 'bottom':
        x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        y = triggerRect.bottom + 8;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - 8;
        y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        break;
      case 'right':
        x = triggerRect.right + 8;
        y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        break;
    }
    
    // Keep tooltip within viewport
    const padding = 10;
    x = Math.max(padding, Math.min(x, window.innerWidth - tooltipRect.width - padding));
    y = Math.max(padding, Math.min(y, window.innerHeight - tooltipRect.height - padding));
    
    setCoords({ x, y });
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [isVisible]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className="inline-flex"
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-3 py-2 text-xs text-white bg-neutral-900 border border-white/10 rounded-lg shadow-xl pointer-events-none transition-opacity duration-200 opacity-0 animate-fade-in max-w-xs"
          style={{
            left: `${coords.x}px`,
            top: `${coords.y}px`,
          }}
        >
          {content}
          <div 
            className={`absolute w-2 h-2 bg-neutral-900 border border-white/10 rotate-45 ${
              position === 'top' ? 'bottom-[-5px] left-1/2 -translate-x-1/2 border-t-0 border-l-0' :
              position === 'bottom' ? 'top-[-5px] left-1/2 -translate-x-1/2 border-b-0 border-r-0' :
              position === 'left' ? 'right-[-5px] top-1/2 -translate-y-1/2 border-l-0 border-b-0' :
              'left-[-5px] top-1/2 -translate-y-1/2 border-r-0 border-t-0'
            }`}
          />
        </div>
      )}
    </>
  );
}

// Info Icon with Tooltip
export function InfoTooltip({ content }: { content: string | React.ReactNode }) {
  return (
    <Tooltip content={content}>
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="More information"
      >
        <span className="text-[10px] text-white/60">?</span>
      </button>
    </Tooltip>
  );
}