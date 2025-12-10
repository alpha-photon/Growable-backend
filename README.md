# GrowAble Backend API

Backend API for GrowAble India - Empowering Every Child to Learn, Speak & Grow. Built with Express.js and MongoDB.

## 🚀 Features

- **User Authentication** - JWT-based authentication
- **Blog Posts** - Create, read, update, delete posts
- **Comments** - Comment system with replies
- **Content Moderation** - Automatic and manual content moderation
- **User Profiles** - User management and profiles
- **Admin Panel** - Moderation dashboard

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## 🔧 Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Create `.env` file:**
```bash
cp .env.example .env
```

3. **Update `.env` with your configuration:**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/specialable
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
```

4. **Start MongoDB:**
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas (cloud)
```

5. **Run the server:**
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── middleware/
│   ├── auth.middleware.js   # Authentication middleware
│   └── errorHandler.js      # Error handling
├── models/
│   ├── User.model.js        # User schema
│   ├── Post.model.js        # Post schema
│   └── Comment.model.js     # Comment schema
├── routes/
│   ├── auth.routes.js       # Authentication routes
│   ├── posts.routes.js      # Post routes
│   ├── comments.routes.js  # Comment routes
│   ├── users.routes.js      # User routes
│   └── moderation.routes.js # Moderation routes
├── utils/
│   ├── generateToken.js     # JWT token generation
│   └── contentModeration.js # Content moderation utilities
├── server.js                # Main server file
└── package.json
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Posts
- `GET /api/posts` - Get all posts (with filters)
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/Unlike post
- `POST /api/posts/:id/flag` - Flag post for review

### Comments
- `GET /api/comments/post/:postId` - Get comments for post
- `POST /api/comments` - Create comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment
- `POST /api/comments/:id/like` - Like comment

### Users
- `GET /api/users/:id` - Get user profile
- `GET /api/users/:id/posts` - Get user's posts

### Moderation (Admin only)
- `GET /api/moderation/posts` - Get posts pending moderation
- `PUT /api/moderation/posts/:id/approve` - Approve post
- `PUT /api/moderation/posts/:id/reject` - Reject post
- `GET /api/moderation/comments` - Get comments pending moderation
- `PUT /api/moderation/comments/:id/approve` - Approve comment
- `PUT /api/moderation/comments/:id/reject` - Reject comment

## 🛡️ Content Moderation

The platform includes automatic content moderation:

1. **Keyword Filtering** - Checks for prohibited keywords
2. **Profanity Filter** - Uses bad-words library
3. **Medical Claims Detection** - Flags content with medical claims for review
4. **Length Validation** - Validates content length
5. **XSS Prevention** - Sanitizes HTML content

## 🔐 Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- Helmet.js for security headers
- CORS configuration
- Input validation with express-validator
- XSS prevention

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRE` | JWT expiration | 7d |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5173 |

## 🧪 Testing

```bash
# Test API endpoints using Postman or curl
curl http://localhost:5000/health
```

## 📦 Dependencies

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **jsonwebtoken** - JWT authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **bad-words** - Profanity filter
- **helmet** - Security headers
- **cors** - CORS middleware
- **morgan** - HTTP request logger

## 🚀 Deployment

1. Set `NODE_ENV=production` in `.env`
2. Update `MONGODB_URI` to production database
3. Set strong `JWT_SECRET`
4. Deploy to Heroku, Railway, or any Node.js hosting

## 📄 License

ISC

## 👤 Author

Divyansh Rohil - GrowAble India

