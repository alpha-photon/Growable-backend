#!/bin/bash
# Docker build test script for growable-backend

echo "🐳 Testing Docker build for growable-backend..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Build the image
echo "📦 Building Docker image..."
docker build -t growable-backend:latest .

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Docker build successful!"
    echo ""
    echo "To run the container:"
    echo "  docker run -p 8000:8000 --env-file .env growable-backend:latest"
    echo ""
    echo "Or with environment variables:"
    echo "  docker run -p 8000:8000 -e MONGODB_URI=your_mongo_uri -e JWT_SECRET=your_secret growable-backend:latest"
else
    echo ""
    echo "❌ Docker build failed. Check the error messages above."
    exit 1
fi
