# API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 🔐 Authentication Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "parent" // optional: "parent" | "teacher" | "therapist"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "parent",
    "verified": false
  }
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Updated",
  "bio": "My bio",
  "avatar": "https://..."
}
```

---

## 📝 Post Endpoints

### Get All Posts
```http
GET /api/posts?page=1&limit=10&category=success-story&sort=latest
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 50)
- `category` - Filter by category: `success-story`, `tips`, `experience`, `advice`, `resource`, `question`
- `specialNeeds` - Filter by special need (e.g., `autism`, `dyslexia`)
- `search` - Search in title and content
- `sort` - Sort by: `latest`, `popular`, `trending`

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 100,
  "page": 1,
  "pages": 10,
  "data": [...]
}
```

### Get Single Post
```http
GET /api/posts/:id
```

### Create Post
```http
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My Success Story",
  "content": "Full content here...",
  "category": "success-story",
  "tags": ["autism", "speech"],
  "specialNeeds": ["autism"],
  "images": ["https://..."],
  "status": "pending" // or "draft"
}
```

**Categories:**
- `success-story` - Success stories
- `tips` - Tips and advice
- `experience` - Personal experiences
- `advice` - Seeking/giving advice
- `resource` - Resources and tools
- `question` - Questions

### Update Post
```http
PUT /api/posts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated title",
  "content": "Updated content"
}
```

### Delete Post
```http
DELETE /api/posts/:id
Authorization: Bearer <token>
```

### Like/Unlike Post
```http
POST /api/posts/:id/like
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "liked": true,
  "likes": 5
}
```

### Flag Post
```http
POST /api/posts/:id/flag
Authorization: Bearer <token>
```

---

## 💬 Comment Endpoints

### Get Comments for Post
```http
GET /api/comments/post/:postId
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "...",
      "content": "Great post!",
      "authorName": "John",
      "replies": [...]
    }
  ]
}
```

### Create Comment
```http
POST /api/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "postId": "post_id",
  "content": "My comment",
  "parentId": null // or comment_id for replies
}
```

### Update Comment
```http
PUT /api/comments/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Updated comment"
}
```

### Delete Comment
```http
DELETE /api/comments/:id
Authorization: Bearer <token>
```

### Like Comment
```http
POST /api/comments/:id/like
Authorization: Bearer <token>
```

---

## 👤 User Endpoints

### Get User Profile
```http
GET /api/users/:id
```

### Get User's Posts
```http
GET /api/users/:id/posts?page=1&limit=10
```

---

## 🛡️ Moderation Endpoints (Admin Only)

### Get Posts Pending Moderation
```http
GET /api/moderation/posts?status=pending&page=1&limit=20
```

### Approve Post
```http
PUT /api/moderation/posts/:id/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "notes": "Approved - looks good"
}
```

### Reject Post
```http
PUT /api/moderation/posts/:id/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "notes": "Rejected - inappropriate content",
  "reason": "Contains medical claims without disclaimer"
}
```

### Get Comments Pending Moderation
```http
GET /api/moderation/comments?page=1&limit=20
```

### Approve Comment
```http
PUT /api/moderation/comments/:id/approve
Authorization: Bearer <admin_token>
```

### Reject Comment
```http
PUT /api/moderation/comments/:id/reject
Authorization: Bearer <admin_token>
```

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Optional message"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [...] // Validation errors
}
```

### Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

---

## 🔒 Content Moderation

All posts and comments go through automatic moderation:

1. **Keyword Filtering** - Checks for prohibited keywords
2. **Profanity Filter** - Filters bad words
3. **Medical Claims** - Flags content with medical claims for review
4. **Length Validation** - Validates content length
5. **XSS Prevention** - Sanitizes HTML

**Status Flow:**
- `draft` → User saves as draft
- `pending` → Submitted, awaiting moderation
- `approved` → Published and visible
- `rejected` → Rejected by moderator
- `flagged` → Flagged by users (3+ flags)

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- Pagination starts from page 1
- Maximum content length: 10,000 characters
- Maximum title length: 200 characters
- Images should be uploaded to Cloudinary or similar service

