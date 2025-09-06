# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Start the Web Application
```bash
cd packages/web
npm run dev
```
Open http://localhost:3000

### 2. Choose Your Data Mode

**Option A: On-Chain Data (Default)**
- ✅ Always works
- ⚠️ Slower loading
- No additional setup required

**Option B: Subgraph Data (Faster)**
```bash
# Use the mode switcher
./switch-mode.sh

# Or manually edit .env.local
NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/reality-kaia
```

### 3. Start Subgraph (Optional)
```bash
# Requires Docker Desktop
cd ../../subgraph/reality-kaia
./dev.sh
```

## 🔧 Configuration

### Environment Variables
```bash
# packages/web/.env.local
NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/reality-kaia
NEXT_PUBLIC_RPC_MAINNET=https://public-en.node.kaia.io
NEXT_PUBLIC_RPC_TESTNET=https://public-en-kairos.node.kaia.io
```

### Mode Switching
```bash
cd packages/web
./switch-mode.sh
```

## 🧪 Testing

### Test Subgraph Connection
```bash
cd packages/web
node test-subgraph.js
```

### Test Web Application
- Dashboard: http://localhost:3000/dashboard
- Create Question: http://localhost:3000/create
- Question Detail: http://localhost:3000/q/[question-id]

## 📊 Data Sources

| Mode | Speed | Reliability | Setup |
|------|-------|-------------|-------|
| On-Chain | Slow | High | None |
| Local Subgraph | Fast | Medium | Docker |
| Production Subgraph | Fastest | High | Deployment |

## 🆘 Troubleshooting

### Subgraph Not Working
```bash
# Check if running
curl http://localhost:8000/subgraphs/name/reality-kaia

# Fallback to on-chain
# Comment out NEXT_PUBLIC_SUBGRAPH_URL in .env.local
```

### Docker Issues
```bash
# Start Docker Desktop
# Then run: cd subgraph/reality-kaia && ./dev.sh
```

## 📚 Documentation

- [Full Setup Guide](SUBGRAPH_SETUP.md)
- [Subgraph Documentation](subgraph/reality-kaia/README.md)
- [Web App Documentation](packages/web/README.md)