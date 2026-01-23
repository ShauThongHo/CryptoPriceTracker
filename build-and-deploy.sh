#!/bin/bash
# Build and Deploy Script for Crypto PWA
# Make executable: chmod +x build-and-deploy.sh

echo "🔨 Building Frontend..."

# Navigate to frontend directory
cd crypto-pwa || exit 1

# Build the React app
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Return to root
    cd ..
    
    # Remove old dist folder from backend if it exists
    if [ -d "crypto-backend/dist" ]; then
        echo "🗑️  Removing old dist folder..."
        rm -rf crypto-backend/dist
    fi
    
    # Copy new dist folder to backend
    echo "📦 Copying dist to backend..."
    cp -r crypto-pwa/dist crypto-backend/dist
    
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Commit changes: git add . && git commit -m 'Deploy frontend'"
    echo "   2. Push to GitHub: git push"
    echo "   3. On Android: cd ~/CryptoPrice/crypto-backend && git pull"
    echo "   4. On Android: node server.js"
    echo "   5. Access at: http://ANDROID_IP:3000"
    echo ""
else
    echo "❌ Build failed!"
    cd ..
    exit 1
fi
