#!/bin/bash

# Deploy Reality.eth subgraph for Kaia network

echo "🚀 Deploying Reality.eth subgraph for Kaia network..."

# Check if graph-cli is installed
if ! command -v graph &> /dev/null; then
    echo "❌ Graph CLI not found. Installing..."
    npm install -g @graphprotocol/graph-cli
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate code
echo "🔧 Generating code..."
npm run codegen

# Build subgraph
echo "🏗️ Building subgraph..."
npm run build

# Deploy to The Graph Network (you'll need to authenticate first)
echo "🚀 Deploying to The Graph Network..."
echo "Note: You need to authenticate with 'graph auth --studio <access-token>' first"
echo "Get your access token from: https://thegraph.com/studio/"

# Uncomment the line below after setting up authentication
# npm run deploy

echo "✅ Subgraph deployment script completed!"
echo "📝 Next steps:"
echo "1. Get access token from https://thegraph.com/studio/"
echo "2. Run: graph auth --studio <your-access-token>"
echo "3. Run: npm run deploy"
echo "4. Update NEXT_PUBLIC_SUBGRAPH_URL in .env.local with the deployed URL"