# Reality.eth Subgraph for Kaia Network

This subgraph indexes Reality.eth protocol events on the Kaia network, providing fast and efficient access to question and answer data.

## Features

- Indexes all questions created on Reality.eth
- Tracks answers and their bonds
- Monitors question finalization
- Provides GraphQL API for querying data

## Quick Start

### Local Development

1. **Start local Graph Node:**
   ```bash
   ./dev.sh
   ```

2. **Update web app configuration:**
   ```bash
   # In packages/web/.env.local
   NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/reality-kaia
   ```

3. **Access GraphQL Playground:**
   - Open http://localhost:8000/subgraphs/name/reality-kaia
   - Test queries like:
   ```graphql
   {
     questions(first: 10, orderBy: createdTs, orderDirection: desc) {
       id
       asker
       question
       finalized
       bestAnswer
       bestBond
     }
   }
   ```

### Production Deployment

1. **Get access token from The Graph Studio:**
   - Visit https://thegraph.com/studio/
   - Create a new subgraph
   - Get your access token

2. **Authenticate:**
   ```bash
   graph auth --studio <your-access-token>
   ```

3. **Deploy:**
   ```bash
   ./deploy.sh
   ```

4. **Update web app:**
   ```bash
   # In packages/web/.env.local
   NEXT_PUBLIC_SUBGRAPH_URL=https://api.thegraph.com/subgraphs/name/your-username/reality-kaia
   ```

## Schema

### Question Entity
```graphql
type Question @entity {
  id: Bytes!           # Question ID
  asker: Bytes!        # Address of question asker
  templateId: Int!     # Template ID used
  question: String     # Question text
  contentHash: Bytes!  # Content hash
  arbitrator: Bytes!   # Arbitrator address
  timeout: Int!        # Timeout in seconds
  openingTs: Int!      # Opening timestamp
  createdTs: BigInt!   # Creation timestamp
  bestAnswer: Bytes    # Best answer
  bestBond: BigInt     # Best bond amount
  bestAnswerer: Bytes  # Best answerer address
  lastAnswerTs: BigInt # Last answer timestamp
  finalized: Boolean!  # Whether question is finalized
  answers: [Answer!]!  # Related answers
}
```

### Answer Entity
```graphql
type Answer @entity {
  id: Bytes!        # Answer ID
  question: Question! # Related question
  answer: Bytes!     # Answer value
  answerer: Bytes!   # Answerer address
  bond: BigInt!      # Bond amount
  ts: BigInt!        # Timestamp
  txHash: Bytes!     # Transaction hash
  logIndex: Int!     # Log index
}
```

## Example Queries

### Get recent questions
```graphql
{
  questions(first: 10, orderBy: createdTs, orderDirection: desc) {
    id
    asker
    question
    finalized
    bestAnswer
    bestBond
    createdTs
  }
}
```

### Get questions by asker
```graphql
{
  questions(where: { asker: "0x..." }) {
    id
    question
    finalized
    bestAnswer
  }
}
```

### Get answers for a question
```graphql
{
  question(id: "0x...") {
    id
    question
    answers {
      answer
      answerer
      bond
      ts
    }
  }
}
```

## Network Configuration

- **Kaia Testnet (1001)**: `0xbbEe32980523c5205B64C74d1c33A3f2585CcD05`
- **Kaia Mainnet (8217)**: Not deployed yet

## Troubleshooting

### Local Development Issues

1. **Docker not running:**
   ```bash
   # Start Docker Desktop
   # Then run: ./dev.sh
   ```

2. **Port conflicts:**
   ```bash
   # Check what's using the ports
   lsof -i :8000
   lsof -i :5001
   lsof -i :5432
   ```

3. **Subgraph not syncing:**
   - Check Graph Node logs: `docker-compose logs graph-node`
   - Verify RPC endpoint is accessible
   - Check if contract address is correct

### Production Issues

1. **Authentication failed:**
   ```bash
   # Re-authenticate
   graph auth --studio <new-access-token>
   ```

2. **Deployment failed:**
   - Check subgraph.yaml syntax
   - Verify network configuration
   - Ensure contract is deployed on target network

## Development

### Adding New Events

1. Update `schema.graphql` with new entities
2. Add event handlers in `mapping.ts`
3. Update `subgraph.yaml` with new events
4. Run `npm run codegen` and `npm run build`

### Testing

```bash
# Test locally
./dev.sh

# Test queries in GraphQL Playground
# http://localhost:8000/subgraphs/name/reality-kaia
```