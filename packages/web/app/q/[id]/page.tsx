'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, usePublicClient, useChainId } from 'wagmi'
import { formatEther, parseEther, keccak256, toBytes, encodeAbiParameters, parseAbiParameters } from 'viem'
import { REALITIO_ABI, ERC20_ABI, getDeployedAddresses, resolveBondTokens, getDeployments, type BondToken } from '@/lib/contracts'
import { CHAIN_LABEL } from '@/lib/viem'

export default function QuestionDetail({ params }: { params: { id: string } }) {
  const questionId = params.id as `0x${string}`
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  
  const [question, setQuestion] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [answerForm, setAnswerForm] = useState({
    answer: '',
    bond: '',
    isCommit: false,
    nonce: '',
  })
  
  const [revealForm, setRevealForm] = useState({
    answer: '',
    nonce: '',
  })
  
  const [bondTokenInfo, setBondTokenInfo] = useState<BondToken | null>(null)

  useEffect(() => {
    loadQuestion()
    const interval = setInterval(loadQuestion, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [questionId, publicClient, chainId])

  async function loadQuestion() {
    if (!publicClient) return
    
    try {
      const addresses = await getDeployedAddresses(chainId)
      if (!addresses) return

      const questionData = await publicClient.readContract({
        address: addresses.realitioERC20 as `0x${string}`,
        abi: REALITIO_ABI,
        functionName: 'getQuestion',
        args: [questionId],
      })

      const questionInfo = {
        id: questionId,
        arbitrator: questionData[0],
        bondToken: questionData[1],
        timeout: questionData[2],
        openingTs: questionData[3],
        contentHash: questionData[4],
        bestAnswer: questionData[5],
        bestBond: questionData[6],
        bestAnswerer: questionData[7],
        lastAnswerTs: questionData[8],
        finalized: questionData[9],
      }
      
      setQuestion(questionInfo)
      
      // Get bond token info
      const deployments = await getDeployments(chainId)
      const tokens = resolveBondTokens(chainId, deployments)
      const token = tokens.find(t => t.address.toLowerCase() === questionInfo.bondToken?.toLowerCase())
      setBondTokenInfo(token || null)
    } catch (err) {
      console.error('Error loading question:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!walletClient || !address || !publicClient) return
    
    setActionLoading(true)
    setError('')
    
    try {
      const addresses = await getDeployedAddresses(chainId)
      if (!addresses) throw new Error('Contract addresses not found')
      
      const bondAmount = parseEther(answerForm.bond)
      
      // Approve token if needed
      if (question.bondToken && question.bondToken !== '0x0000000000000000000000000000000000000000') {
        await walletClient.writeContract({
          address: question.bondToken as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [addresses.realitioERC20 as `0x${string}`, bondAmount],
        })
      }
      
      if (answerForm.isCommit) {
        // Submit commitment
        const answerBytes = encodeAbiParameters(
          parseAbiParameters('bytes32'),
          [toBytes(answerForm.answer, { size: 32 })]
        )
        const nonceBytes = keccak256(toBytes(answerForm.nonce))
        const answerHash = keccak256(
          encodeAbiParameters(
            parseAbiParameters('bytes32, bytes32'),
            [answerBytes, nonceBytes]
          )
        )
        
        await walletClient.writeContract({
          address: addresses.realitioERC20 as `0x${string}`,
          abi: REALITIO_ABI,
          functionName: 'submitAnswerCommitment',
          args: [questionId, answerHash, bondAmount],
        })
      } else {
        // Submit answer directly
        const answerBytes = encodeAbiParameters(
          parseAbiParameters('bytes32'),
          [toBytes(answerForm.answer, { size: 32 })]
        )
        
        if (question.bondToken && question.bondToken !== '0x0000000000000000000000000000000000000000') {
          await walletClient.writeContract({
            address: addresses.realitioERC20 as `0x${string}`,
            abi: REALITIO_ABI,
            functionName: 'submitAnswerWithToken',
            args: [questionId, answerBytes, bondAmount, question.bondToken as `0x${string}`],
          })
        } else {
          await walletClient.writeContract({
            address: addresses.realitioERC20 as `0x${string}`,
            abi: REALITIO_ABI,
            functionName: 'submitAnswer',
            args: [questionId, answerBytes, bondAmount],
          })
        }
      }
      
      await loadQuestion()
      setAnswerForm({ answer: '', bond: '', isCommit: false, nonce: '' })
    } catch (err: any) {
      console.error('Error submitting answer:', err)
      setError(err.message || 'Failed to submit answer')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReveal = async () => {
    if (!walletClient || !address) return
    
    setActionLoading(true)
    setError('')
    
    try {
      const addresses = await getDeployedAddresses(chainId)
      if (!addresses) throw new Error('Contract addresses not found')
      
      const answerBytes = encodeAbiParameters(
        parseAbiParameters('bytes32'),
        [toBytes(revealForm.answer, { size: 32 })]
      )
      const nonceBytes = keccak256(toBytes(revealForm.nonce))
      
      await walletClient.writeContract({
        address: addresses.realitioERC20 as `0x${string}`,
        abi: REALITIO_ABI,
        functionName: 'revealAnswer',
        args: [questionId, answerBytes, nonceBytes],
      })
      
      await loadQuestion()
      setRevealForm({ answer: '', nonce: '' })
    } catch (err: any) {
      console.error('Error revealing answer:', err)
      setError(err.message || 'Failed to reveal answer')
    } finally {
      setActionLoading(false)
    }
  }

  const handleFinalize = async () => {
    if (!walletClient || !address) return
    
    setActionLoading(true)
    setError('')
    
    try {
      const addresses = await getDeployedAddresses(chainId)
      if (!addresses) throw new Error('Contract addresses not found')
      
      await walletClient.writeContract({
        address: addresses.realitioERC20 as `0x${string}`,
        abi: REALITIO_ABI,
        functionName: 'finalize',
        args: [questionId],
      })
      
      await loadQuestion()
    } catch (err: any) {
      console.error('Error finalizing:', err)
      setError(err.message || 'Failed to finalize')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center">Loading question details...</div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center">Question not found</div>
      </div>
    )
  }

  const canFinalize = question.lastAnswerTs > 0 && 
    Date.now() / 1000 > Number(question.lastAnswerTs) + Number(question.timeout) &&
    !question.finalized

  const minBond = question.bestBond > 0 ? BigInt(question.bestBond) * 2n : 1n

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-2xl font-bold mb-6">Question Details</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Question ID</p>
                <p className="font-mono text-xs">{question.id}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium">{question.finalized ? 'Finalized' : 'Open'}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Bond Token</p>
                <p className="font-medium">
                  {bondTokenInfo ? `${bondTokenInfo.label} (${bondTokenInfo.symbol})` : 'Native KAIA'}
                  {bondTokenInfo?.symbol === 'WKAIA' && (
                    <span className="ml-2 text-xs text-gray-500">
                      (Wrapped KAIA)
                    </span>
                  )}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Timeout</p>
                <p>{question.timeout} seconds</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Current Best Answer</p>
                <p className="font-mono">{question.bestAnswer || 'None'}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Current Best Bond</p>
                <p>{question.bestBond ? formatEther(question.bestBond) : '0'} {bondTokenInfo?.symbol || 'KAIA'}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Minimum Next Bond</p>
                <p>{formatEther(minBond)} {bondTokenInfo?.symbol || 'KAIA'}</p>
              </div>
              
              {question.finalized && (
                <div className="p-4 bg-green-50 rounded-md">
                  <p className="text-sm font-medium text-green-800">Final Result</p>
                  <p className="font-mono text-green-900">{question.bestAnswer}</p>
                </div>
              )}
            </div>
            
            {!question.finalized && (
              <div className="mt-8 space-y-6">
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Submit Answer</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Answer (bytes32 or number)
                      </label>
                      <input
                        type="text"
                        value={answerForm.answer}
                        onChange={(e) => setAnswerForm({ ...answerForm, answer: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
                        placeholder="1 for YES, 0 for NO, or custom bytes32"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Bond Amount (in tokens)
                      </label>
                      <input
                        type="text"
                        value={answerForm.bond}
                        onChange={(e) => setAnswerForm({ ...answerForm, bond: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
                        placeholder={formatEther(minBond)}
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isCommit"
                        checked={answerForm.isCommit}
                        onChange={(e) => setAnswerForm({ ...answerForm, isCommit: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isCommit" className="ml-2 block text-sm text-gray-900">
                        Use commit-reveal
                      </label>
                    </div>
                    
                    {answerForm.isCommit && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Nonce (for commit-reveal)
                        </label>
                        <input
                          type="text"
                          value={answerForm.nonce}
                          onChange={(e) => setAnswerForm({ ...answerForm, nonce: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
                          placeholder="Secret nonce"
                        />
                      </div>
                    )}
                    
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={actionLoading || !address}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {actionLoading ? 'Submitting...' : 'Submit Answer'}
                    </button>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Reveal Commitment</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Answer
                      </label>
                      <input
                        type="text"
                        value={revealForm.answer}
                        onChange={(e) => setRevealForm({ ...revealForm, answer: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nonce
                      </label>
                      <input
                        type="text"
                        value={revealForm.nonce}
                        onChange={(e) => setRevealForm({ ...revealForm, nonce: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
                      />
                    </div>
                    
                    <button
                      onClick={handleReveal}
                      disabled={actionLoading || !address}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {actionLoading ? 'Revealing...' : 'Reveal Answer'}
                    </button>
                  </div>
                </div>
                
                {canFinalize && (
                  <div className="border-t pt-6">
                    <button
                      onClick={handleFinalize}
                      disabled={actionLoading || !address}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading ? 'Finalizing...' : 'Finalize Question'}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}