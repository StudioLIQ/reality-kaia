## Make KAIA Great Again

<img src="https://cdn.kaiascan.io/nft/mainnet/0x37dafcbc7237c2e063e19439c3775c2e8cda3a80/404/1756888463299_404.avif">
<a href="https://www.kaiascan.io/account/0x7abedc832254daa2032505e33a8dd325841d6f2d">inchyangv.kaia</a>

<br>

---

# RealitioERC20 - Reality.eth Compatible Oracle for KAIA

A minimalist implementation of Reality.eth oracle system with ERC20 token bonds and a web dashboard for KAIA blockchain.



## Disclaimer

This software and the associated smart contracts/web application (the “Service”) are provided as a **personal project** and **have not undergone any third-party security audit**. The Service is provided **“AS IS”** and **“AS AVAILABLE.”**

The developer **assumes no liability** for any losses arising from the use, distribution, forking, or integration of the Service, including, without limitation, **loss of digital assets, price volatility, data corruption, service interruption, or regulatory compliance issues**. All risks related to **smart-contract vulnerabilities, economic attacks, and failures of networks/oracles/wallets/frontends** are borne by the user.

Nothing herein constitutes **investment, legal, or tax advice**. Users are solely responsible for complying with applicable laws and regulations in their jurisdiction. By using the Service, you **agree** to these terms.

> ⚠️ Not audited · Personal project · Provided AS IS · Use at your own risk.


## Features

- **RealitioERC20**: Core oracle contract with ERC20 token bonds
  - 2x bond escalation rule
  - Commit-reveal mechanism (reveal window = timeout/8)
  - Question creation, answering, and finalization
  - Safety verification via `getFinalAnswerIfMatches`
  - Arbitration support

- **ArbitratorSimple**: K-of-N multisig arbitrator
  - Configurable signer threshold
  - Fee-based arbitration requests

- **Web Dashboard**: Next.js application for interacting with contracts
  - Question listing and creation
  - Answer submission (direct and commit-reveal)
  - Question finalization
  - Wallet connection with KAIA support

## Chain Configuration

- **KAIA Mainnet**: Chain ID 8217
  - WKAIA: 0x19Aac5f612f524B754CA7e7c41cbFa2E981A4432
- **Kairos Testnet**: Chain ID 1001
  - WKAIA: 0x043c471bEe060e00A56CcD02c0Ca286808a5A436
  - RPC: https://public-en-kairos.node.kaia.io

## Installation

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Node.js 20+
- pnpm (or npm/yarn)

### Setup

1. Clone the repository:
```bash
git clone <repository>
cd optimistic-oracle
```

2. Install Foundry dependencies:
```bash
cd packages/protocol
forge install
```

3. Install web dependencies:
```bash
cd ../web
pnpm install
```

4. Configure environment:
```bash
cp .env.example .env
# Edit .env with your RPC URLs and private key
```

## Building and Testing

### Protocol

```bash
cd packages/protocol

# Build contracts
forge build

# Run tests with 300 fuzz runs
forge test -vvvv --fuzz-runs 300

# Generate gas report
forge test --gas-report
```

### Web Dashboard

```bash
cd packages/web

# Development server
pnpm dev

# Production build
pnpm build
pnpm start
```

## Deployment

### Quick Deployment

```bash
# 1) Configure environment
cp .env.example .env
# Edit .env with your values:
# - PRIVATE_KEY, KAIA_MAINNET_RPC, KAIA_TESTNET_RPC (required)
# - FEE_RECIPIENT, FEE_BPS (optional: defaults to 0x7abE... / 25)

# 2) Deploy to testnet
bash scripts/deploy.sh testnet

# 3) Deploy to mainnet  
bash scripts/deploy.sh mainnet

# Frontend automatically syncs deployment addresses
```

### Manual Deployment

```bash
cd packages/protocol

# Set environment variables
export PRIVATE_KEY=your_private_key
export KAIA_TESTNET_RPC=your_rpc_url

# Deploy to Kairos testnet
forge script script/DeployAll.s.sol:DeployAll \
  --rpc-url $KAIA_TESTNET_RPC \
  --broadcast

# Deploy to KAIA mainnet
export KAIA_MAINNET_RPC=your_mainnet_rpc
forge script script/DeployAll.s.sol:DeployAll \
  --rpc-url $KAIA_MAINNET_RPC \
  --broadcast
```

Deployment addresses are saved to `deployments/<chainId>.json`.

### Create a Question

```bash
forge script script/AskQuestion.s.sol:AskQuestion \
  --rpc-url $KAIA_TESTNET_RPC \
  --broadcast
```

This creates an example question and outputs:
- Question ID
- Content hash
- Timeout period
- Bond token address

### Simulate Resolution

```bash
# Set question ID from AskQuestion output
export QUESTION_ID=0x...

forge script script/SimulateResolve.s.sol:SimulateResolve \
  --rpc-url $KAIA_TESTNET_RPC \
  --broadcast
```

This simulates the complete lifecycle:
1. Submit commitment
2. Wait for reveal window
3. Reveal answer
4. Wait for timeout
5. Finalize question
6. Claim winnings

## Contract Architecture

### Core Components

**IReality.sol**: Interface defining Reality.eth compatible methods
- `askQuestion`: Create new questions
- `submitAnswer`: Submit direct answers with bonds
- `submitAnswerCommitment`: Submit hashed answers for later reveal
- `revealAnswer`: Reveal committed answers
- `finalize`: Finalize questions after timeout
- `resultFor`: Get finalized results
- `getFinalAnswerIfMatches`: Safe result retrieval with validation

**RealityLib.sol**: Utility library for:
- Question ID calculation
- Content hash generation
- Answer hash computation
- Timing validations
- Bond calculations

**RealitioERC20.sol**: Main oracle implementation
- ERC20 token bond management with SafeERC20
- ReentrancyGuard for security
- 2x bond escalation enforcement
- Commit-reveal with timeout/8 window
- Reward distribution to winners

**ArbitratorSimple.sol**: Multisig arbitrator
- K-of-N threshold signatures
- Fee collection and distribution
- Signer management

## Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **SafeERC20**: Safe token transfers
- **Bond Escalation**: 2x minimum bond increase
- **Commit-Reveal**: Prevents front-running
- **Content Hash Validation**: Ensures question integrity
- **Arbitrator Verification**: Multi-party dispute resolution

## Testing

The test suite includes:

### Unit Tests
- Basic answer flow with 2x bond rule
- Commit-reveal mechanism
- Arbitration path
- Invalid answer handling
- Safety checks (`getFinalAnswerIfMatches`)

### Fuzz Tests (300 runs each)
- Bond rule invariants
- Reveal window timing
- Finalization timing

Run tests:
```bash
forge test -vvvv --fuzz-runs 300
```

## Web Dashboard Usage

1. Start the development server:
```bash
cd packages/web
pnpm dev
```

2. Open http://localhost:3000

3. Connect your wallet (KAIA/Kairos network)

4. Features:
   - **Home**: View all questions
   - **Create**: Submit new questions
   - **Question Details**: Answer, reveal, and finalize

## Gas Optimization

- Solidity 0.8.25 with optimizer (200 runs)
- `viaIR = true` for advanced optimizations
- Efficient storage packing in Question struct
- Minimal external calls

## License

MIT