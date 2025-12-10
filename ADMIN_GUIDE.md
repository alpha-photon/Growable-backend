# Admin Guide - Post Moderation

## Quick Commands

### Check Post Status
```bash
cd backend
node scripts/checkPosts.js
```

### Approve All Pending Posts (for testing)
```bash
cd backend
node scripts/approveAllPosts.js
```

## Why Posts Don't Show Up?

**Default Behavior:** Blog page only shows **approved** posts to maintain content quality.

**Post Status Flow:**
1. User creates post → Status: `pending`
2. Admin reviews → Status: `approved` or `rejected`
3. Only `approved` posts are visible on blog

## Approve Posts via API

### Option 1: Using Admin Token
```bash
# First, login as admin and get token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Use the token to approve posts
curl -X PUT http://localhost:8000/api/moderation/posts/{postId}/approve \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Approved"}'
```

### Option 2: Using Script
```bash
cd backend
node scripts/approveAllPosts.js
```

## Create Admin User

To create an admin user, update the user role in MongoDB:

```javascript
// In MongoDB shell or script
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

## Future: Admin Dashboard

We can create a frontend admin panel where you can:
- View all pending posts
- Approve/reject posts
- See moderation queue
- Manage users

Would you like me to create an admin dashboard?

