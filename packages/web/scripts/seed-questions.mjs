#!/usr/bin/env node
// Seed a set of realistic example questions covering all templates.
// Usage:
//   CHAIN_ID=1001 PRIVATE_KEY=0x... RPC_URL=https://public-en-kairos.node.kaia.io node packages/web/scripts/seed-questions.mjs
// Options:
//   BOND_TOKEN=WKAIA|USDT            # choose token by symbol (default: USDT)
//   BOND_TOKEN_ADDRESS=0x...         # override token address explicitly
//   --token=wkaia | --token=usdt     # CLI equivalent of BOND_TOKEN
// Notes:
// - Uses askQuestionERC20V3 which registers questions for pagination.
// - No tokens are spent on creation.

import { readFile } from 'node:fs/promises'
import { createWalletClient, createPublicClient, http, keccak256, toHex, encodeAbiParameters } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const CHAIN_ID = Number(process.env.CHAIN_ID || '1001')
const RPC_URL = process.env.RPC_URL || (CHAIN_ID === 8217
  ? process.env.NEXT_PUBLIC_RPC_MAINNET || 'https://public-en.node.kaia.io'
  : process.env.NEXT_PUBLIC_RPC_TESTNET || 'https://public-en-kairos.node.kaia.io')
const PK = process.env.PRIVATE_KEY
const CLI_TOKEN = (process.argv.find(a => a.startsWith('--token=')) || '').split('=')[1]
const TOKEN_PREF = (process.env.BOND_TOKEN || CLI_TOKEN || 'USDT').toUpperCase()
const TOKEN_ADDR_OVERRIDE = process.env.BOND_TOKEN_ADDRESS

if (!PK) {
  console.error('Missing PRIVATE_KEY env. Export PRIVATE_KEY=0x... and re-run.')
  process.exit(1)
}

// Minimal ABI (V3 write + V1 event for questionId)
const ABI = [
  {
    type: 'function', name: 'askQuestionERC20V3', stateMutability: 'nonpayable',
    inputs: [
      { type: 'address', name: 'bondToken' },
      { type: 'uint32',  name: 'templateId' },
      { type: 'string',  name: 'content' },
      { type: 'string',  name: 'outcomesPacked' },
      { type: 'address', name: 'arbitrator' },
      { type: 'uint32',  name: 'timeout' },
      { type: 'uint32',  name: 'openingTs' },
      { type: 'bytes32', name: 'nonce' },
      { type: 'string',  name: 'language' },
      { type: 'string',  name: 'category' },
      { type: 'string',  name: 'metadataURI' }
    ],
    outputs: [{ type: 'bytes32' }]
  },
  {
    type: 'event', name: 'LogNewQuestion',
    inputs: [
      { indexed: true,  type: 'bytes32', name: 'questionId' },
      { indexed: true,  type: 'address', name: 'asker' },
      { indexed: false, type: 'uint32',  name: 'templateId' },
      { indexed: false, type: 'string',  name: 'question' },
      { indexed: false, type: 'bytes32', name: 'contentHash' },
      { indexed: false, type: 'address', name: 'arbitrator' },
      { indexed: false, type: 'uint32',  name: 'timeout' },
      { indexed: false, type: 'uint32',  name: 'openingTs' },
      { indexed: false, type: 'bytes32', name: 'nonce' },
      { indexed: false, type: 'uint256', name: 'createdTs' }
    ]
  }
]

function outcomesJoin(arr) {
  // Unit Separator 0x1F
  return Array.isArray(arr) ? arr.join('\u001F') : ''
}

function makeNonce() {
  const rand = crypto.getRandomValues(new Uint8Array(32))
  const randHash = keccak256(rand)
  const nowSec = BigInt(Math.floor(Date.now() / 1000))
  return keccak256(encodeAbiParameters([
    { type: 'bytes32' }, { type: 'uint64' }
  ], [randHash, nowSec]))
}

async function main() {
  const deploymentsPath = new URL(`../public/deployments/${CHAIN_ID}.json`, import.meta.url)
  const deployments = JSON.parse(await readFile(deploymentsPath, 'utf8'))
  const reality = (deployments.RealitioERC20 || deployments.realitioERC20)
  const arbitrator = deployments.arbitratorSimple
  let bondToken = TOKEN_ADDR_OVERRIDE
  if (!bondToken) {
    if (TOKEN_PREF === 'WKAIA') bondToken = deployments.WKAIA
    else bondToken = deployments.USDT || deployments.MockUSDT
  }

  if (!reality || !arbitrator || !bondToken) {
    console.error('Missing addresses in deployments. Need RealitioERC20, arbitratorSimple, and USDT/MockUSDT.')
    process.exit(1)
  }

  const account = privateKeyToAccount(PK.startsWith('0x') ? PK : `0x${PK}`)
  const publicClient = createPublicClient({ transport: http(RPC_URL) })
  const walletClient = createWalletClient({ account, transport: http(RPC_URL) })

  const Q = [
    // Template 1: Binary
    {
      templateId: 1,
      content: 'Will BTC close above $70,000 on 2025-12-31 00:00 UTC?\nAnswers: YES/NO',
      outcomes: [], category: 'Markets',
    },
    {
      templateId: 1,
      content: 'Will Kaia mainnet reach block 100,000,000 before 2026-01-01 00:00 UTC?\nAnswers: YES/NO',
      outcomes: [], category: 'Blockchain',
    },
    // Template 3: Multiple Choice
    {
      templateId: 3,
      content: 'Who will win the Kaia Cup 2025?\nChoices: A) Team Atlas, B) Team Borealis, C) Draw',
      outcomes: ['Team Atlas', 'Team Borealis', 'Draw'], category: 'Sports',
    },
    // Template 4: Integer
    {
      templateId: 4,
      content: 'How many daily active addresses on Kaia on 2025-10-01? (integer, unit=addresses)',
      outcomes: [], category: 'Metrics',
    },
    // Template 5: Datetime
    {
      templateId: 5,
      content: 'When will contract 0x043c471bEe060e00A56CcD02c0Ca286808a5A436 be deployed on Kaia mainnet? (answer = unix seconds, UTC)',
      outcomes: [], category: 'Releases',
    },
    // Template 7: Text (hash)
    {
      templateId: 7,
      content: 'What is the verified release code name? (keccak256(lowercase(trimmed)))',
      outcomes: [], category: 'Releases',
    },
  ]

  const timeout = 24 * 60 * 60 // 24h
  const openingTs = 0 // use 0 to mean "now" per contract semantics
  const language = 'en'
  const metadataURI = ''

  console.log(`Seeding ${Q.length} questions on chain ${CHAIN_ID} using ${account.address}`)
  console.log(`Reality: ${reality}`)
  console.log(`Bond Token: ${bondToken} (${TOKEN_PREF}${TOKEN_ADDR_OVERRIDE ? ' / override' : ''})`)

  for (const [i, q] of Q.entries()) {
    const nonce = makeNonce()
    const outcomesPacked = outcomesJoin(q.outcomes)
    const hash = await walletClient.writeContract({
      address: reality,
      abi: ABI,
      functionName: 'askQuestionERC20V3',
      args: [
        bondToken,
        q.templateId,
        q.content,
        outcomesPacked,
        arbitrator,
        timeout,
        openingTs,
        nonce,
        language,
        q.category,
        metadataURI,
      ],
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    // Extract questionId from logs
    let questionId = null
    const topic = '0x' + keccak256(toHex('LogNewQuestion(bytes32,address,uint32,string,bytes32,address,uint32,uint32,bytes32,uint256)')).slice(2)
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== reality.toLowerCase()) continue
      if (log.topics && log.topics[0] === topic && log.topics[1]) {
        questionId = log.topics[1]
        break
      }
    }
    console.log(`  [${i+1}/${Q.length}] ${q.templateId}: ${q.content.split('\n')[0]}`)
    console.log(`    tx: ${hash}`)
    console.log(`    qid: ${questionId || '(not found in logs)'}`)
  }

  console.log('Done.')
}

main().catch((e) => { console.error(e); process.exit(1) })
