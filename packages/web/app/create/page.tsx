'use client'

import { useState } from 'react'
import { useAccount, useWalletClient, useChainId } from 'wagmi'
import { parseEther, keccak256, toBytes } from 'viem'
import { REALITIO_ABI, getDeployedAddresses } from '@/lib/contracts'
import { useRouter } from 'next/navigation'

export default function CreateQuestion() {
  const router = useRouter()
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const chainId = useChainId()
  
  const [formData, setFormData] = useState({
    templateId: '0',
    question: '',
    arbitrator: '',
    timeout: '86400',
    openingTs: '0',
    bondToken: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletClient || !address) {
      setError('Please connect your wallet')
      return
    }

    setLoading(true)
    setError('')

    try {
      const addresses = await getDeployedAddresses(chainId)
      if (!addresses) {
        throw new Error('Contract addresses not found')
      }

      const nonce = keccak256(toBytes(Date.now().toString()))
      
      const arbitratorAddress = formData.arbitrator || addresses.arbitratorSimple
      const openingTs = formData.openingTs === '0' ? Math.floor(Date.now() / 1000) : parseInt(formData.openingTs)

      const hash = await walletClient.writeContract({
        address: addresses.realitioERC20 as `0x${string}`,
        abi: REALITIO_ABI,
        functionName: 'askQuestion',
        args: [
          parseInt(formData.templateId),
          formData.question,
          arbitratorAddress as `0x${string}`,
          parseInt(formData.timeout),
          openingTs,
          nonce,
        ],
      })

      router.push('/')
    } catch (err: any) {
      console.error('Error creating question:', err)
      setError(err.message || 'Failed to create question')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-2xl font-bold mb-6">Create New Question</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="templateId" className="block text-sm font-medium text-gray-700">
                  Template ID
                </label>
                <input
                  type="number"
                  id="templateId"
                  value={formData.templateId}
                  onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="question" className="block text-sm font-medium text-gray-700">
                  Question
                </label>
                <textarea
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Will ETH price be above $3000 on 2025-01-01?"
                  required
                />
              </div>

              <div>
                <label htmlFor="arbitrator" className="block text-sm font-medium text-gray-700">
                  Arbitrator Address (optional)
                </label>
                <input
                  type="text"
                  id="arbitrator"
                  value={formData.arbitrator}
                  onChange={(e) => setFormData({ ...formData, arbitrator: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Leave empty to use default arbitrator"
                />
              </div>

              <div>
                <label htmlFor="timeout" className="block text-sm font-medium text-gray-700">
                  Timeout (seconds)
                </label>
                <input
                  type="number"
                  id="timeout"
                  value={formData.timeout}
                  onChange={(e) => setFormData({ ...formData, timeout: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  min="25"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">Minimum 25 seconds, default 86400 (24 hours)</p>
              </div>

              <div>
                <label htmlFor="openingTs" className="block text-sm font-medium text-gray-700">
                  Opening Timestamp
                </label>
                <input
                  type="number"
                  id="openingTs"
                  value={formData.openingTs}
                  onChange={(e) => setFormData({ ...formData, openingTs: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-sm text-gray-500">0 for immediate opening, or Unix timestamp for future opening</p>
              </div>

              <div>
                <label htmlFor="bondToken" className="block text-sm font-medium text-gray-700">
                  Bond Token Address (optional)
                </label>
                <input
                  type="text"
                  id="bondToken"
                  value={formData.bondToken}
                  onChange={(e) => setFormData({ ...formData, bondToken: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="ERC20 token address for bonds"
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !address}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}