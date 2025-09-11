"use client";
import { useState } from 'react';
import { InfoTooltip } from '@/components/Tooltip';
import { formatTokenAmount } from '@/lib/formatters';
import { parseUnits } from 'viem';

interface AnswerFormProps {
  question: any;
  metadata: any;
  bondTokenInfo: any;
  minBond: bigint;
  onSubmit: (answer: string, bond: string, isCommit: boolean, nonce: string) => Promise<void>;
  loading?: boolean;
}

export default function AnswerForm({ 
  question, 
  metadata, 
  bondTokenInfo, 
  minBond, 
  onSubmit, 
  loading = false 
}: AnswerFormProps) {
  const [answer, setAnswer] = useState('');
  const [bond, setBond] = useState('');
  const [isCommit, setIsCommit] = useState(false);
  const [nonce, setNonce] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const templateId = metadata?.templateId ? Number(metadata.templateId) : undefined;
  const tokenDecimals = bondTokenInfo?.decimals || 18;
  const tokenSymbol = bondTokenInfo?.symbol || 'TOKEN';
  const minBondFormatted = formatTokenAmount(minBond, tokenDecimals, '', { showFullPrecision: false });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(answer, bond, isCommit, nonce);
    setAnswer('');
    setBond('');
    setNonce('');
  };
  
  // Get answer hints based on template
  const getAnswerHelp = () => {
    switch (templateId) {
      case 1:
        return "Select YES (1) or NO (0)";
      case 3:
        return "Select one of the multiple choice options";
      case 4:
        return "Enter a numeric value";
      case 5:
        return "Enter a Unix timestamp in seconds";
      default:
        return "Enter your answer";
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-6 space-y-5">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Submit Your Answer
        </h3>
        
        {/* Answer Input */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-white">Your Answer</label>
            <InfoTooltip content={getAnswerHelp()} />
          </div>
          
          {templateId === 1 ? (
            // Yes/No buttons for binary questions
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAnswer('1')}
                className={`p-4 rounded-lg border transition-all ${
                  answer === '1' 
                    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' 
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">YES</span>
              </button>
              <button
                type="button"
                onClick={() => setAnswer('0')}
                className={`p-4 rounded-lg border transition-all ${
                  answer === '0' 
                    ? 'border-red-400/30 bg-red-400/10 text-red-300' 
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="font-medium">NO</span>
              </button>
            </div>
          ) : templateId === 3 && metadata?.outcomesPacked ? (
            // Multiple choice buttons
            <div className="grid gap-2">
              {metadata.outcomesPacked.split('\u001F').map((choice: string, index: number) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setAnswer(String(index))}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    answer === String(index)
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm ${
                    answer === String(index) ? 'bg-emerald-400/20' : 'bg-white/10'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{choice}</span>
                </button>
              ))}
            </div>
          ) : (
            // Text input for other types
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="input-field"
              placeholder={getAnswerHelp()}
              required
            />
          )}
        </div>
        
        {/* Bond Amount */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-white">Bond Amount</label>
            <InfoTooltip content={`Minimum bond: ${minBondFormatted} ${tokenSymbol}. Higher bonds increase confidence in your answer.`} />
          </div>
          <div className="relative">
            <input
              type="text"
              value={bond}
              onChange={(e) => setBond(e.target.value)}
              className="input-field pr-20"
              placeholder={minBondFormatted}
              required
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-white/50 text-sm font-medium">{tokenSymbol}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {[1, 1.5, 2, 3].map(multiplier => {
              const amount = formatTokenAmount(
                BigInt(Math.floor(Number(minBond) * multiplier)), 
                tokenDecimals, 
                '', 
                { showFullPrecision: false }
              );
              return (
                <button
                  key={multiplier}
                  type="button"
                  onClick={() => setBond(amount)}
                  className="px-3 py-1 rounded-lg border border-white/10 text-xs text-white/60 hover:bg-white/5 transition-colors"
                >
                  {multiplier === 1 ? 'Min' : `${multiplier}x`}: {amount}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Advanced Options */}
        <div className="border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white/80 transition-colors"
          >
            <svg 
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Advanced Options
          </button>
          
          {showAdvanced && (
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="isCommit"
                  checked={isCommit}
                  onChange={(e) => setIsCommit(e.target.checked)}
                  className="mt-1 rounded border-white/20 bg-white/5 text-emerald-400 focus:ring-emerald-400/50"
                />
                <div className="flex-1">
                  <label htmlFor="isCommit" className="text-sm font-medium text-white">
                    Use Commit-Reveal
                  </label>
                  <p className="text-xs text-white/50 mt-1">
                    Hide your answer until you reveal it later. Useful for preventing front-running.
                  </p>
                </div>
              </div>
              
              {isCommit && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Secret Nonce</label>
                  <input
                    type="text"
                    value={nonce}
                    onChange={(e) => setNonce(e.target.value)}
                    className="input-field"
                    placeholder="Enter a secret phrase or number"
                    required={isCommit}
                  />
                  <p className="text-xs text-white/50">
                    Save this! You'll need the exact same nonce to reveal your answer later.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !answer || !bond || parseFloat(bond) < parseFloat(minBondFormatted)}
          className="w-full btn-primary"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 004 12z"/>
              </svg>
              <span>Submitting Answer...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{isCommit ? 'Submit Commitment' : 'Submit Answer'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}