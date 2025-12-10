# Backend Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup Environment Variables

Create a `.env` file in the `backend` folder:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
# Option 1: Local MongoDB
MONGODB_URI=mongodb://localhost:27017/specialable

# Option 2: MongoDB Atlas (Cloud)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/specialable

# JWT Secret (Change this to a random string in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Admin Email (optional - for creating first admin)
ADMIN_EMAIL=admin@specialable.in
```

### 3. Start MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB locally, then:
mongod
```

**Option B: MongoDB Atlas (Recommended for beginners)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a cluster (free tier available)
4. Get connection string
5. Update `MONGODB_URI` in `.env`

### 4. Run the Server

```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:5000`

## Testing the API

### Health Check
```bash
curl http://localhost:5000/health
```

### Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "parent"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Creating First Admin User

You can create an admin user manually in MongoDB or use this script:

```javascript
// createAdmin.js
import mongoose from 'mongoose';
import User from './models/User.model.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const admin = await User.findOneAndUpdate(
      { email: process.env.ADMIN_EMAIL || 'admin@specialable.in' },
      {
        name: 'Admin User',
        email: process.env.ADMIN_EMAIL || 'admin@specialable.in',
        password: 'admin123', // Change this!
        role: 'admin',
        verified: true,
      },
      { upsert: true, new: true }
    );
    
    console.log('Admin user created:', admin);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createAdmin();
```

## API Testing with Postman

1. Import the collection (create one with these endpoints)
2. Set base URL: `http://localhost:5000/api`
3. Test endpoints:
   - Register → Get token
   - Use token in Authorization header: `Bearer <token>`
   - Test protected routes

## Common Issues

### MongoDB Connection Error
- Check if MongoDB is running
- Verify `MONGODB_URI` in `.env`
- Check firewall settings

### Port Already in Use
- Change `PORT` in `.env`
- Or kill process using port 5000:
  ```bash
  lsof -ti:5000 | xargs kill
  ```

### Module Not Found
- Run `npm install` again
- Check Node.js version (should be 18+)

## Next Steps

1. ✅ Backend is running
2. Connect frontend to backend
3. Test API endpoints
4. Deploy to production

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Use MongoDB Atlas or managed database
4. Enable HTTPS
5. Set up proper CORS
6. Use environment variables for all secrets

