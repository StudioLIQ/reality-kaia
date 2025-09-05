'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAccount, usePublicClient, useChainId } from 'wagmi'
import { formatEther } from 'viem'
import { REALITIO_ABI } from '@/lib/contracts'
import { useAddresses } from '@/lib/contracts.client'
import Link from 'next/link'
import QuestionFilters, { type QuestionRow } from '@/components/QuestionFilters'
import StatCard from '@/components/StatCard'
import { DataTable, Th, Td, TRow } from '@/components/DataTable'
import { deriveStatus, computeDeadline } from '@/lib/status'

export default function Home() {
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<QuestionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const { address } = useAccount()
  const { addr, ready: addrReady, loading: addrLoading, error: addrError } = useAddresses()
  
  // Handle client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function loadQuestions() {
      if (!publicClient || !mounted) return
      
      if (!addr.reality) {
        setLoading(false)
        return
      }

      try {
        const logs = await publicClient.getLogs({
          address: addr.reality as `0x${string}`,
          event: {
            type: 'event',
            name: 'LogNewQuestion',
            inputs: REALITIO_ABI.find(a => a.type === 'event' && a.name === 'LogNewQuestion')?.inputs || []
          },
          fromBlock: 'earliest',
          toBlock: 'latest',
        })

        const questionPromises = logs.map(async (log: any) => {
          const questionId = log.args.questionId
          const questionData = await publicClient.readContract({
            address: addr.reality as `0x${string}`,
            abi: REALITIO_ABI,
            functionName: 'getQuestion',
            args: [questionId],
          })

          // Parse the tuple response
          const [
            contentHash,
            arbitrator,
            openingTsContract,
            timeoutContract,
            finalizeTs,
            isPendingArbitration,
            bountyRaw,
            bestAnswer,
            historyHash,
            bondTokenAddr
          ] = questionData as any

          // Determine token symbol based on bond token address
          let bondTokenSymbol: "USDT" | "WKAIA" | undefined
          const bondToken = (bondTokenAddr || log.args.bondToken || '0x0000000000000000000000000000000000000000') as `0x${string}`
          if (bondToken === '0x0000000000000000000000000000000000000000') {
            bondTokenSymbol = "WKAIA"
          } else if (bondToken.toLowerCase().includes('ceaa')) {
            bondTokenSymbol = "USDT"
          }

          return {
            id: questionId,
            text: log.args.question,
            question: log.args.question,
            templateId: log.args.templateId,
            timeout: log.args.timeout || timeoutContract,
            timeoutSec: log.args.timeout || timeoutContract,
            openingTs: log.args.openingTs || openingTsContract,
            createdTs: log.args.createdTs,
            createdAt: log.args.createdTs,
            asker: log.args.user as `0x${string}`,
            user: log.args.user as `0x${string}`,
            bondToken: bondToken,
            bondTokenSymbol,
            bestBond: bountyRaw as bigint,
            currentBondRaw: bountyRaw as bigint,
            bestAnswer: bestAnswer as string,
            finalized: finalizeTs > 0,
            isPendingArbitration: isPendingArbitration as boolean,
          } as QuestionRow
        })

        const questionsData = await Promise.all(questionPromises)
        setQuestions(questionsData.reverse())
      } catch (error) {
        console.error('Error loading questions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [publicClient, chainId, mounted])

  // Calculate stats based on filtered questions
  const stats = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000)
    const openQuestions = filteredQuestions.filter(q => !q.finalized).length
    const totalQuestions = filteredQuestions.length
    const totalBondValue = filteredQuestions.reduce((acc, q) => {
      const bond = q.bestBond || q.currentBondRaw
      return acc + (bond ? Number(formatEther(bond)) : 0)
    }, 0)
    
    return { openQuestions, totalQuestions, totalBondValue }
  }, [filteredQuestions])

  // Loading guards
  if (addrLoading || !mounted) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-r-transparent" />
            <p className="mt-4 text-white/60">Loading network deployments...</p>
          </div>
        </div>
      </div>
    )
  }
  
  if (addrError || !addrReady) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-300">
          Missing deployment info for chain {chainId}. Ensure 
          <code className="mx-1 px-1 rounded bg-black/40">/deployments/{chainId}.json</code>
          exists in <code className="px-1 rounded bg-black/40">packages/web/public/deployments</code>.
        </div>
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-r-transparent" />
            <p className="mt-4 text-white/60">Loading questions...</p>
          </div>
        </div>
      </div>
    )
  }

  const nowSec = Math.floor(Date.now() / 1000)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="mt-1 text-sm text-white/60">Browse and answer oracle questions</p>
      </div>

      {/* Filters */}
      <QuestionFilters items={questions} onChange={setFilteredQuestions} />

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard title="Total Questions" value={stats.totalQuestions.toString()} trend="up" />
        <StatCard title="Open Questions" value={stats.openQuestions.toString()} meta={<span>Active now</span>} />
        <StatCard title="Total Bonds" value={`${stats.totalBondValue.toFixed(2)}`} meta={<span>All tokens</span>} />
      </div>
        
      {filteredQuestions.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <p className="text-white/60 text-center">No questions match your filters.</p>
          <div className="mt-4 text-center">
            <Link 
              href="/create" 
              className="inline-flex items-center px-4 py-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 text-sm font-medium transition-colors"
            >
              Create Question
            </Link>
          </div>
        </div>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>Question</Th>
              <Th>Status</Th>
              <Th>Token</Th>
              <Th align="right">Current Bond</Th>
              <Th align="center">Deadline</Th>
              <Th align="center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {filteredQuestions.map((q) => {
              const status = deriveStatus(q, nowSec)
              const deadline = computeDeadline(q)
              const statusColors = {
                SCHEDULED: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
                OPEN: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30',
                ANSWERED: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
                FINALIZED: 'bg-white/10 text-white/60',
                DISPUTED: 'bg-red-400/10 text-red-400 border-red-400/30'
              }
              
              return (
                <TRow key={q.id}>
                  <Td>
                    <div className="max-w-xs">
                      <p className="text-white font-medium truncate">{q.text || q.question}</p>
                      <p className="text-xs text-white/40 mt-1">ID: {q.id.slice(0, 10)}...</p>
                    </div>
                  </Td>
                  <Td>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full border ${statusColors[status]}`}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-white/80 text-sm">
                      {q.bondTokenSymbol || (q.bondToken === '0x0000000000000000000000000000000000000000' ? 'WKAIA' : 'ERC20')}
                    </span>
                  </Td>
                  <Td align="right" className="font-mono text-white/80 text-sm">
                    {q.bestBond || q.currentBondRaw ? formatEther(q.bestBond || q.currentBondRaw || 0n) : '0'}
                  </Td>
                  <Td align="center" className="text-white/60 text-sm">
                    {deadline ? new Date(deadline * 1000).toLocaleDateString() : '-'}
                  </Td>
                  <Td align="center">
                    <Link 
                      href={`/q/${q.id}`}
                      className="inline-flex items-center px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 text-white/80 text-xs font-medium transition-colors"
                    >
                      View
                    </Link>
                  </Td>
                </TRow>
              )
            })}
          </tbody>
        </DataTable>
      )}
    </div>
  )
}