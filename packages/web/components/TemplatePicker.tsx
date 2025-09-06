"use client";
import { useMemo, useState, useEffect } from "react";
import type { TemplateSpec } from "@/lib/templates";

export default function TemplatePicker({
  items, 
  value, 
  onChange,
}: {
  items: TemplateSpec[];
  value?: number;
  onChange: (id: number) => void;
}) {
  const [selected, setSelected] = useState<number | undefined>(value);
  
  useEffect(() => {
    setSelected(value);
  }, [value]);
  
  const pick = (id: number) => { 
    setSelected(id); 
    onChange(id); 
  };
  
  const current = useMemo(() => items.find(i => i.id === selected), [items, selected]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(t => (
          <button 
            key={t.id}
            type="button"
            onClick={() => pick(t.id)}
            className={`text-left rounded-2xl border px-4 py-3 transition-all
              ${t.id === selected 
                ? "border-emerald-400 bg-emerald-400/10 shadow-lg shadow-emerald-400/20" 
                : "border-white/10 hover:border-white/20 hover:bg-white/5"}`}
            aria-pressed={t.id === selected}
            aria-label={`Select template ${t.id}: ${t.label}`}
          >
            <div className="text-xs opacity-70 mb-1">Template #{t.id}</div>
            <div className="font-semibold">{t.label}</div>
            <div className="text-sm opacity-80 mt-1 line-clamp-2">{t.summary}</div>
            {t.badges && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {t.badges.map(b => (
                  <span 
                    key={b} 
                    className="text-[10px] rounded-full border border-white/10 px-2 py-0.5 opacity-80"
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      {current && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm opacity-70">Selected: Template #{current.id}</div>
          </div>
          <div className="font-semibold text-lg mb-3">{current.label}</div>
          
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium opacity-90 mb-2">Guidelines:</div>
              <ul className="list-disc ml-5 text-sm opacity-90 space-y-1">
                {current.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <div className="text-sm font-medium opacity-90 mb-2">Example Question:</div>
              <pre className="whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-3 text-sm font-mono">
                {current.sample}
              </pre>
            </div>
            
            <div className="flex items-center gap-2 text-xs opacity-60">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Answer Type: {current.answerType}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}