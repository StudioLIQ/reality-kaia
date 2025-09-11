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
import { readFileSync } from 'node:fs'
import { createWalletClient, createPublicClient, http, keccak256, toHex, toBytes, encodeAbiParameters } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// Load environment variables from .env files in the web folder
function loadEnvFrom(relativePath) {
  try {
    const url = new URL(relativePath, import.meta.url)
    const text = readFileSync(url, 'utf8')
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const i = line.indexOf('=')
      if (i < 0) continue
      const key = line.slice(0, i).trim()
      let val = line.slice(i + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch {}
}

// Try loading from web/.env* and repo root ../../.env*
loadEnvFrom('../.env')
loadEnvFrom('../.env.local')
loadEnvFrom('../../.env') // packages/.env (if present)
loadEnvFrom('../../.env.local')
loadEnvFrom('../../../.env') // repo root .env
loadEnvFrom('../../../.env.local')

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

// Minimal ABI (V3 write/read + V1 event for questionId)
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
    type: 'function', name: 'getQuestionFullV3', stateMutability: 'view',
    inputs: [{ type: 'bytes32', name: 'questionId' }],
    outputs: [{
      type: 'tuple', components: [
        { type: 'address', name: 'asker' },
        { type: 'address', name: 'arbitrator' },
        { type: 'address', name: 'bondToken' },
        { type: 'uint32',  name: 'templateId' },
        { type: 'uint32',  name: 'timeout' },
        { type: 'uint32',  name: 'openingTs' },
        { type: 'bytes32', name: 'contentHash' },
        { type: 'uint64',  name: 'createdAt' },
        { type: 'string',  name: 'content' },
        { type: 'string',  name: 'outcomesPacked' },
        { type: 'string',  name: 'language' },
        { type: 'string',  name: 'category' },
        { type: 'string',  name: 'metadataURI' },
        { type: 'uint64',  name: 'lastAnswerTs' },
        { type: 'bytes32', name: 'bestAnswer' },
        { type: 'uint256', name: 'bestBond' },
        { type: 'bool',    name: 'finalized' },
        { type: 'bool',    name: 'pendingArbitration' },
      ]
    }]
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

// Deterministic nonce so the same example question is idempotent across runs.
const NONCE_SALT = 'oo:examples:v1'
function deterministicNonce(q, arbitrator, timeout, openingTs) {
  return keccak256(encodeAbiParameters([
    { type: 'uint32' },   // templateId
    { type: 'bytes32' },  // contentHash
    { type: 'string' },   // outcomesPacked
    { type: 'address' },  // arbitrator
    { type: 'uint32' },   // timeout
    { type: 'uint32' },   // openingTs
    { type: 'string' },   // category
    { type: 'string' },   // salt
  ], [
    q.templateId,
    keccak256(toBytes(q.content)),
    outcomesJoin(q.outcomes),
    arbitrator,
    timeout,
    openingTs,
    q.category || '',
    NONCE_SALT,
  ]))
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
    // Template 1: Binary (BTC)
    {
      templateId: 1,
      content: 'Did BTC-USD trade at or above $70,000 on Coinbase between 2025-03-01 00:00:00 UTC and 2025-03-31 23:59:59 UTC?\nAnswers: YES/NO',
      outcomes: [], category: 'Markets',
    },
    // Template 1: Binary (Sports)
    {
      templateId: 1,
      content: 'Did Spain win the UEFA Euro 2024 Final in regular time against England on 2024-07-14?\nAnswers: YES/NO',
      outcomes: [], category: 'Sports',
    },
    // Template 3: Multiple Choice (BTC)
    {
      templateId: 3,
      content: 'What was BTC-USD\'s 24h performance on Coinbase on 2025-03-15 (close-to-close, nearest 0.1%)?\nChoices: A) Up 5%+, B) Up 0–5%, C) Flat (±0.5%), D) Down 0–5%, E) Down 5%+',
      outcomes: ['Up 5%+', 'Up 0–5%', 'Flat (±0.5%)', 'Down 0–5%', 'Down 5%+'], category: 'Markets',
    },
    // Template 3: Multiple Choice (Sports)
    {
      templateId: 3,
      content: 'Who won the 2024 NBA Finals?\nChoices: A) Boston Celtics, B) Dallas Mavericks',
      outcomes: ['Boston Celtics', 'Dallas Mavericks'], category: 'Sports',
    },
    // Template 4: Integer (BTC)
    {
      templateId: 4,
      content: 'What was the BTC-USD price on Coinbase at 2025-03-15 12:00:00 UTC? (answer = integer USD, rounded to nearest dollar)',
      outcomes: [], category: 'Markets',
    },
    // Template 4: Integer (Sports)
    {
      templateId: 4,
      content: 'How many total goals were scored in the 2024 UEFA Champions League Final (Real Madrid vs Borussia Dortmund on 2024-06-01)? (answer = integer, unit=goals)',
      outcomes: [], category: 'Sports',
    },
    // Template 5: Datetime (BTC)
    {
      templateId: 5,
      content: 'When did BTC-USD first trade above $70,000 on Coinbase after 2025-03-01 00:00:00 UTC? (answer = unix seconds, UTC)',
      outcomes: [], category: 'Markets',
    },
    // Template 5: Datetime (Sports)
    {
      templateId: 5,
      content: 'What was the official kickoff time (UTC) of Super Bowl LVIII (Kansas City Chiefs vs San Francisco 49ers on 2024-02-11)? (answer = unix seconds, UTC)',
      outcomes: [], category: 'Sports',
    },
    // Template 7: Text (hash) (BTC)
    {
      templateId: 7,
      content: 'What is the Coinbase ticker symbol used for bitcoin quoted in USD? (answer = uppercase ticker; verify via keccak256(lowercase(trimmed)))',
      outcomes: [], category: 'Markets',
    },
    // Template 7: Text (hash) (Sports)
    {
      templateId: 7,
      content: 'Who was awarded Super Bowl LVIII MVP? (answer = full name per NFL.com; verify via keccak256(lowercase(trimmed)))',
      outcomes: [], category: 'Sports',
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
    const outcomesPacked = outcomesJoin(q.outcomes)
    const nonce = deterministicNonce(q, arbitrator, timeout, openingTs)

    // Compute the expected questionId to make the operation idempotent
    const questionId = keccak256(encodeAbiParameters([
      { type: 'uint32' },
      { type: 'bytes32' },
      { type: 'address' },
      { type: 'uint32' },
      { type: 'uint32' },
      { type: 'bytes32' },
      { type: 'address' },
    ], [
      q.templateId,
      keccak256(toBytes(q.content)),
      arbitrator,
      timeout,
      openingTs,
      nonce,
      account.address,
    ]))

    // Check if question already exists (timeout > 0 means present)
    let exists = false
    try {
      const full = await publicClient.readContract({
        address: reality,
        abi: ABI,
        functionName: 'getQuestionFullV3',
        args: [questionId],
      })
      const timeoutExisting = Number(full?.[4] ?? 0)
      if (timeoutExisting > 0) exists = true
    } catch {}

    if (exists) {
      console.log(`  [${i+1}/${Q.length}] SKIP (exists) ${q.templateId}: ${q.content.split('\n')[0]}`)
      console.log(`    qid: ${questionId}`)
      continue
    }

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
    let emittedQuestionId = null
    const topic = '0x' + keccak256(toHex('LogNewQuestion(bytes32,address,uint32,string,bytes32,address,uint32,uint32,bytes32,uint256)')).slice(2)
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== reality.toLowerCase()) continue
      if (log.topics && log.topics[0] === topic && log.topics[1]) {
        emittedQuestionId = log.topics[1]
        break
      }
    }
    console.log(`  [${i+1}/${Q.length}] ${q.templateId}: ${q.content.split('\n')[0]}`)
    console.log(`    tx: ${hash}`)
    console.log(`    qid: ${emittedQuestionId || questionId}`)
  }

  console.log('Done.')
}

main().catch((e) => { console.error(e); process.exit(1) })
