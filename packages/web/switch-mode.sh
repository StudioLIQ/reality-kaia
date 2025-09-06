#!/bin/bash

# Script to switch between on-chain and subgraph data modes

ENV_FILE=".env.local"

echo "🔄 Orakore Data Mode Switcher"
echo "=============================="

if [ ! -f "$ENV_FILE" ]; then
    echo "📝 Creating $ENV_FILE..."
    cat > "$ENV_FILE" << EOF
# Subgraph Configuration
# NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/reality-kaia

# RPC Configuration
NEXT_PUBLIC_RPC_MAINNET=https://public-en.node.kaia.io
NEXT_PUBLIC_RPC_TESTNET=https://public-en-kairos.node.kaia.io
EOF
fi

echo ""
echo "Current configuration:"
if grep -q "^NEXT_PUBLIC_SUBGRAPH_URL=" "$ENV_FILE"; then
    echo "✅ Subgraph mode enabled"
    SUBGRAPH_URL=$(grep "^NEXT_PUBLIC_SUBGRAPH_URL=" "$ENV_FILE" | cut -d'=' -f2)
    echo "📍 URL: $SUBGRAPH_URL"
else
    echo "🔗 On-chain mode enabled"
fi

echo ""
echo "Choose mode:"
echo "1) Switch to On-chain mode (default, slower but always works)"
echo "2) Switch to Local subgraph mode (faster, requires Docker)"
echo "3) Switch to Production subgraph mode (fastest, requires deployment)"
echo "4) Test current subgraph connection"
echo "5) Exit"

read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo "🔗 Switching to on-chain mode..."
        sed -i.bak 's/^NEXT_PUBLIC_SUBGRAPH_URL=/#NEXT_PUBLIC_SUBGRAPH_URL=/' "$ENV_FILE"
        echo "✅ Switched to on-chain mode"
        echo "💡 Restart your dev server: npm run dev"
        ;;
    2)
        echo "🚀 Switching to local subgraph mode..."
        sed -i.bak 's/^#NEXT_PUBLIC_SUBGRAPH_URL=/NEXT_PUBLIC_SUBGRAPH_URL=/' "$ENV_FILE"
        sed -i.bak 's|NEXT_PUBLIC_SUBGRAPH_URL=.*|NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/reality-kaia|' "$ENV_FILE"
        echo "✅ Switched to local subgraph mode"
        echo "💡 Make sure subgraph is running: cd ../../subgraph/reality-kaia && ./dev.sh"
        echo "💡 Then restart your dev server: npm run dev"
        ;;
    3)
        read -p "Enter production subgraph URL: " prod_url
        echo "🌐 Switching to production subgraph mode..."
        sed -i.bak 's/^#NEXT_PUBLIC_SUBGRAPH_URL=/NEXT_PUBLIC_SUBGRAPH_URL=/' "$ENV_FILE"
        sed -i.bak "s|NEXT_PUBLIC_SUBGRAPH_URL=.*|NEXT_PUBLIC_SUBGRAPH_URL=$prod_url|" "$ENV_FILE"
        echo "✅ Switched to production subgraph mode"
        echo "💡 Restart your dev server: npm run dev"
        ;;
    4)
        echo "🧪 Testing subgraph connection..."
        if [ -f "test-subgraph.js" ]; then
            node test-subgraph.js
        else
            echo "❌ test-subgraph.js not found"
        fi
        ;;
    5)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "📋 Current configuration:"
cat "$ENV_FILE" | grep -E "(NEXT_PUBLIC_SUBGRAPH_URL|# NEXT_PUBLIC_SUBGRAPH_URL)"