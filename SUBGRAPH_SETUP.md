# Subgraph Setup Guide

This guide explains how to set up and use the Reality.eth subgraph for the Orakore project.

## Overview

The project now supports both on-chain data fetching and subgraph-based data fetching. The subgraph provides faster and more efficient access to question and answer data.

## Current Configuration

- **Default Mode**: On-chain data fetching (when `NEXT_PUBLIC_SUBGRAPH_URL` is not set)
- **Subgraph Mode**: Fast data fetching via GraphQL (when `NEXT_PUBLIC_SUBGRAPH_URL` is set)

## Quick Start

### Option 1: Use On-Chain Data (Current Default)

The project is already configured to work with on-chain data. No additional setup required.

```bash
cd packages/web
npm run dev
```

### Option 2: Use Local Subgraph

1. **Start Docker Desktop**

2. **Start local subgraph:**
   ```bash
   cd subgraph/reality-kaia
   ./dev.sh
   ```

3. **Enable subgraph in web app:**
   ```bash
   # In packages/web/.env.local
   NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/reality-kaia
   ```

4. **Restart web app:**
   ```bash
   cd packages/web
   npm run dev
   ```

### Option 3: Use Production Subgraph

1. **Deploy subgraph to The Graph Network:**
   ```bash
   cd subgraph/reality-kaia
   ./deploy.sh
   ```

2. **Update environment:**
   ```bash
   # In packages/web/.env.local
   NEXT_PUBLIC_SUBGRAPH_URL=https://api.thegraph.com/subgraphs/name/your-username/reality-kaia
   ```

## Configuration Files

### Environment Variables

**`packages/web/.env.local`:**
```bash
# Subgraph Configuration
# Uncomment to enable subgraph mode
# NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/reality-kaia

# RPC Configuration
NEXT_PUBLIC_RPC_MAINNET=https://public-en.node.kaia.io
NEXT_PUBLIC_RPC_TESTNET=https://public-en-kairos.node.kaia.io
```

### Subgraph Configuration

**`subgraph/reality-kaia/subgraph.yaml`:**
- Configured for Kaia Testnet (chain 1001)
- Reality contract: `0xbbEe32980523c5205B64C74d1c33A3f2585CcD05`
- Indexes questions, answers, and finalizations

## Data Flow

### On-Chain Mode (Default)
```
Dashboard → useQuestionsChain → RPC calls → Contract events
```

### Subgraph Mode
```
Dashboard → useQuestionsSubgraph → GraphQL → Indexed data
```

## Testing

### Test Subgraph Connection
```bash
cd packages/web
node test-subgraph.js
```

### Test Web Application
```bash
cd packages/web
npm run dev
# Open http://localhost:3000/dashboard
```

## Troubleshooting

### Subgraph Not Working

1. **Check if subgraph is running:**
   ```bash
   curl http://localhost:8000/subgraphs/name/reality-kaia
   ```

2. **Check Docker status:**
   ```bash
   docker ps
   ```

3. **Check logs:**
   ```bash
   cd subgraph/reality-kaia
   docker-compose logs graph-node
   ```

### Fallback to On-Chain Data

If subgraph is not available, the app automatically falls back to on-chain data:

```bash
# Comment out or remove NEXT_PUBLIC_SUBGRAPH_URL
# NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/reality-kaia
```

## Development

### Adding New Events

1. Update `subgraph/reality-kaia/schema.graphql`
2. Update `subgraph/reality-kaia/src/mapping.ts`
3. Update `subgraph/reality-kaia/subgraph.yaml`
4. Run `npm run codegen && npm run build`

### Local Development Workflow

1. Start subgraph: `cd subgraph/reality-kaia && ./dev.sh`
2. Enable subgraph: Set `NEXT_PUBLIC_SUBGRAPH_URL` in `.env.local`
3. Start web app: `cd packages/web && npm run dev`
4. Test: Open http://localhost:3000/dashboard

## Production Deployment

1. **Deploy subgraph:**
   ```bash
   cd subgraph/reality-kaia
   ./deploy.sh
   ```

2. **Update production environment:**
   ```bash
   NEXT_PUBLIC_SUBGRAPH_URL=https://api.thegraph.com/subgraphs/name/your-username/reality-kaia
   ```

3. **Deploy web app:**
   ```bash
   cd packages/web
   npm run build
   npm run start
   ```

## Benefits of Using Subgraph

- **Performance**: Faster data loading
- **Efficiency**: Reduced RPC calls
- **Reliability**: Cached and indexed data
- **Scalability**: Better for high-traffic applications
- **Rich Queries**: Complex filtering and sorting

## Network Support

- **Kaia Testnet (1001)**: ✅ Fully supported
- **Kaia Mainnet (8217)**: ⏳ Pending contract deployment