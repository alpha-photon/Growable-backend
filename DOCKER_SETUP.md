# Docker Setup Guide for GrowAble Backend

## Installation Steps

### Option 1: Install Docker Desktop (Recommended)
1. Download Docker Desktop for Mac from: https://www.docker.com/products/docker-desktop/
2. Open the downloaded `.dmg` file
3. Drag Docker.app to Applications folder
4. Open Docker Desktop from Applications
5. Wait for Docker to start (you'll see a whale icon in the menu bar)

### Option 2: Install via Homebrew
```bash
brew install --cask docker
```
Note: This will require your sudo password.

## Testing the Docker Build

Once Docker Desktop is installed and running:

### Quick Test
```bash
cd /Users/divyanshkumar/Documents/Developer/specialable/backend
./docker-build-test.sh
```

### Manual Build
```bash
cd /Users/divyanshkumar/Documents/Developer/specialable/backend
docker build -t growable-backend:latest .
```

### Run the Container
```bash
# With .env file
docker run -p 8000:8000 --env-file .env growable-backend:latest

# Or with environment variables directly
docker run -p 8000:8000 \
  -e MONGODB_URI=your_mongodb_uri \
  -e JWT_SECRET=your_jwt_secret \
  -e PORT=8000 \
  -e NODE_ENV=production \
  growable-backend:latest
```

## Verify Docker is Running
```bash
docker info
docker ps
```

If these commands work, Docker is running correctly.

## Common Issues

1. **Docker not starting**: Make sure Docker Desktop is open and running
2. **Permission errors**: Make sure Docker Desktop has proper permissions in System Settings
3. **Build fails**: Check the error messages - common issues:
   - Missing dependencies in package.json
   - Native module compilation errors
   - Network issues downloading base images

## Dockerfile Details

The Dockerfile is configured for:
- Node.js 20 (LTS)
- Production dependencies only
- Non-root user for security
- Health check endpoint
- Build tools for native modules (natural package)
