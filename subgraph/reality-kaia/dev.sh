#!/bin/bash

# Local development setup for Reality.eth subgraph

echo "🔧 Setting up local subgraph development environment..."

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start local graph node
echo "🚀 Starting local Graph Node..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate code
echo "🔧 Generating code..."
npm run codegen

# Build subgraph
echo "🏗️ Building subgraph..."
npm run build

# Create subgraph on local node
echo "📝 Creating subgraph on local node..."
npm run create-local

# Deploy to local node
echo "🚀 Deploying to local node..."
npm run deploy-local

echo "✅ Local subgraph setup completed!"
echo "📊 Graph Node UI: http://localhost:8000"
echo "🔍 GraphQL endpoint: http://localhost:8000/subgraphs/name/reality-kaia"
echo ""
echo "📝 To use in your web app, update .env.local:"
echo "NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/reality-kaia"