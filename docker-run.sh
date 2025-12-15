#!/bin/bash
# Script to run Docker container locally with Docker Desktop

echo "🐳 Starting GrowAble Backend Docker Container"
echo "=============================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    echo "   Open Docker Desktop application and wait for it to start."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if image exists, if not build it
if ! docker images | grep -q "growable-backend"; then
    echo "📦 Building Docker image..."
    docker build -t growable-backend:latest .
    if [ $? -ne 0 ]; then
        echo "❌ Docker build failed"
        exit 1
    fi
    echo "✅ Image built successfully"
    echo ""
fi

# Check if .env file exists
if [ -f .env ]; then
    echo "📝 Using .env file for environment variables"
    ENV_FILE="--env-file .env"
else
    echo "⚠️  .env file not found. Using default environment variables."
    echo "   Make sure to set MONGODB_URI and other required variables."
    ENV_FILE=""
fi

echo ""
echo "🚀 Starting container..."
echo ""

# Run the container
docker run -d \
    --name growable-backend \
    -p 8000:8000 \
    $ENV_FILE \
    --restart unless-stopped \
    growable-backend:latest

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Container started successfully!"
    echo ""
    echo "📋 Container Information:"
    echo "   Name: growable-backend"
    echo "   Port: http://localhost:8000"
    echo "   Health: http://localhost:8000/health"
    echo ""
    echo "🔍 Useful commands:"
    echo "   View logs:     docker logs -f growable-backend"
    echo "   Stop:          docker stop growable-backend"
    echo "   Start:         docker start growable-backend"
    echo "   Remove:        docker rm -f growable-backend"
    echo "   View status:   docker ps | grep growable-backend"
    echo ""
    echo "📊 Showing logs (press Ctrl+C to exit):"
    echo ""
    sleep 2
    docker logs -f growable-backend
else
    echo ""
    echo "❌ Failed to start container"
    echo "   Check if container with name 'growable-backend' already exists:"
    echo "   docker ps -a | grep growable-backend"
    echo ""
    echo "   If it exists, remove it first:"
    echo "   docker rm -f growable-backend"
    exit 1
fi

