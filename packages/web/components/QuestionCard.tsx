"use client";
import { formatAddress, formatDate, formatTokenAmount, getQuestionTypeInfo } from '@/lib/formatters';
import { InfoTooltip } from '@/components/Tooltip';

interface QuestionCardProps {
  question: any;
  metadata: any;
  bondTokenInfo: any;
  nowSec: number;
}

export default function QuestionCard({ question, metadata, bondTokenInfo, nowSec }: QuestionCardProps) {
  if (!question) return null;
  
  const typeInfo = getQuestionTypeInfo(metadata?.templateId);
  const bestBondRaw = typeof question.bestBond === 'bigint' ? question.bestBond : BigInt(question.bestBond || 0);
  const tokenDecimals = bondTokenInfo?.decimals || 18;
  const tokenSymbol = bondTokenInfo?.symbol || 'TOKEN';
  
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{typeInfo.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-white">{typeInfo.type} Question</h3>
              <p className="text-xs text-white/60">{typeInfo.description}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {question.finalized ? (
            <span className="px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 text-xs font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Finalized
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-blue-400/10 border border-blue-400/30 text-blue-300 text-xs font-medium animate-pulse">
              Active
            </span>
          )}
        </div>
      </div>
      
      {/* Question Content */}
      {metadata?.content && (
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-white leading-relaxed">{metadata.content}</p>
        </div>
      )}
      
      {/* Multiple Choice Options */}
      {metadata?.outcomesPacked && metadata.outcomesPacked.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-white/60 font-medium">Answer Options</p>
          <div className="grid gap-2">
            {metadata.outcomesPacked.split('\u001F').map((choice: string, index: number) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white/80 font-medium text-sm">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="text-white/90">{choice}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-white/60 flex items-center gap-1">
            Current Bond
            <InfoTooltip content="The amount currently backing the best answer" />
          </p>
          <p className="text-lg font-semibold text-white">
            {formatTokenAmount(bestBondRaw, tokenDecimals, tokenSymbol, { compact: true })}
          </p>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-white/60 flex items-center gap-1">
            Min Next Bond
            <InfoTooltip content="Minimum amount required to submit a new answer" />
          </p>
          <p className="text-lg font-semibold text-white">
            {formatTokenAmount(bestBondRaw * 2n, tokenDecimals, tokenSymbol, { compact: true })}
          </p>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-white/60">Timeout Period</p>
          <p className="text-lg font-semibold text-white">
            {question.timeout} seconds
          </p>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-white/60">Created By</p>
          <p className="text-lg font-semibold text-white">
            {metadata?.asker ? formatAddress(metadata.asker, { short: true }) : 'Unknown'}
          </p>
        </div>
      </div>
      
      {/* Timeline */}
      <div className="border-t border-white/10 pt-4">
        <p className="text-xs text-white/60 font-medium mb-3">Timeline</p>
        <div className="flex items-center gap-4 text-xs">
          {metadata?.createdAt && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-white/40" />
              <span className="text-white/60">Created</span>
              <span className="text-white/80">{formatDate(metadata.createdAt, { relative: true })}</span>
            </div>
          )}
          {question.openingTs && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-white/60">Opens</span>
              <span className="text-white/80">{formatDate(question.openingTs, { relative: true })}</span>
            </div>
          )}
          {question.lastAnswerTs > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-white/60">Last Answer</span>
              <span className="text-white/80">{formatDate(question.lastAnswerTs, { relative: true })}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Additional Info */}
      {(metadata?.category || metadata?.metadataURI) && (
        <div className="border-t border-white/10 pt-4 flex flex-wrap gap-4 text-xs">
          {metadata.category && (
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="text-white/60">Category:</span>
              <span className="text-white/80">{metadata.category}</span>
            </div>
          )}
          {metadata.metadataURI && (
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <a 
                href={metadata.metadataURI} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                View Metadata
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}