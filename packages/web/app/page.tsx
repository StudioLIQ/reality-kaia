'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useChainId } from 'wagmi'
import { formatEther, parseEventLogs } from 'viem'
import { REALITIO_ABI, getDeployedAddresses } from '@/lib/contracts'
import Link from 'next/link'

export default function Home() {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
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
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">Loading questions...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h2 className="text-2xl font-bold mb-6">Recent Questions</h2>
        
        {questions.length === 0 ? (
          <div className="bg-white overflow-hidden shadow rounded-lg p-6">
            <p className="text-gray-500 text-center">No questions yet. Be the first to create one!</p>
            <div className="mt-4 text-center">
              <Link href="/create" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                Create Question
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{q.text}</h3>
                      <div className="mt-2 text-sm text-gray-500">
                        <p>Timeout: {q.timeout} seconds</p>
                        <p>Best Bond: {q.bestBond ? formatEther(q.bestBond) : '0'} tokens</p>
                        <p>Status: {q.finalized ? 'Finalized' : 'Open'}</p>
                        {q.finalized && <p>Result: {q.bestAnswer}</p>}
                      </div>
                    </div>
                    <div>
                      <Link 
                        href={`/q/${q.id}`}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}