'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useChainId } from 'wagmi'
import { formatEther, parseEventLogs } from 'viem'
import { REALITIO_ABI, getDeployedAddresses } from '@/lib/contracts'
import Link from 'next/link'
import DisclaimerBadge from '@/components/DisclaimerBadge'
import NetworkChips from '@/components/NetworkChips'
import StatCard from '@/components/StatCard'
import { DataTable, Th, Td, TRow } from '@/components/DataTable'

export default function Home() {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [networkFilter, setNetworkFilter] = useState<number | 'all'>('all')
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const { address } = useAccount()

  useEffect(() => {
    async function loadQuestions() {
      if (!publicClient) return
      
      const addresses = await getDeployedAddresses(chainId)
      if (!addresses) {
        setLoading(false)
        return
      }

      try {
        const logs = await publicClient.getLogs({
          address: addresses.realitioERC20 as `0x${string}`,
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
          const question = await publicClient.readContract({
            address: addresses.realitioERC20 as `0x${string}`,
            abi: REALITIO_ABI,
            functionName: 'getQuestion',
            args: [questionId],
          })

          return {
            id: questionId,
            text: log.args.question,
            templateId: log.args.templateId,
            timeout: log.args.timeout,
            openingTs: log.args.openingTs,
            createdTs: log.args.createdTs,
            ...question,
          }
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
  }, [publicClient, chainId])

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

  // Calculate stats
  const openQuestions = questions.filter(q => !q.finalized).length
  const totalQuestions = questions.length
  const totalBondValue = questions.reduce((acc, q) => acc + (q.bestBond ? Number(formatEther(q.bestBond)) : 0), 0)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Filter row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NetworkChips value={networkFilter} onChange={setNetworkFilter} />
        <DisclaimerBadge compact />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard title="Total Questions" value={totalQuestions.toString()} trend="up" />
        <StatCard title="Open Questions" value={openQuestions.toString()} meta={<span>Active now</span>} />
        <StatCard title="Total Bonds" value={`${totalBondValue.toFixed(2)}`} meta={<span>All tokens</span>} />
      </div>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Recent Questions</h2>
        <p className="mt-1 text-sm text-white/60">Browse and answer oracle questions</p>
      </div>
        
      {questions.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <p className="text-white/60 text-center">No questions yet. Be the first to create one!</p>
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
              <Th>Bond Token</Th>
              <Th align="right">Best Bond</Th>
              <Th align="center">Timeout</Th>
              <Th align="center">Action</Th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <TRow key={q.id}>
                <Td>
                  <div className="max-w-xs">
                    <p className="text-white font-medium truncate">{q.text}</p>
                    <p className="text-xs text-white/40 mt-1">ID: {q.id.slice(0, 10)}...</p>
                  </div>
                </Td>
                <Td>
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    q.finalized 
                      ? 'bg-white/10 text-white/60' 
                      : 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/30'
                  }`}>
                    {q.finalized ? 'Finalized' : 'Open'}
                  </span>
                </Td>
                <Td>
                  <span className="text-white/80">{q.bondToken === '0x0000000000000000000000000000000000000000' ? 'Native' : 'ERC20'}</span>
                </Td>
                <Td align="right" className="font-mono text-white/80">
                  {q.bestBond ? formatEther(q.bestBond) : '0'}
                </Td>
                <Td align="center" className="text-white/60">
                  {q.timeout}s
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
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  )
}