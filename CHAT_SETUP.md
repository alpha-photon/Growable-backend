# Chat Rooms Setup Guide

## Quick Setup

To fix the "Chat room not found" error, you need to seed the chat rooms into your database.

### Step 1: Ensure MongoDB is Running

Make sure your MongoDB database is running and accessible via the `MONGODB_URI` in your `.env` file.

### Step 2: Seed Chat Rooms

Run the seed script from the backend directory:

```bash
cd backend
npm run seed:chat-rooms
```

This will create 6 pre-configured chat rooms:
- 🧩 `autism-support` - Autism Support
- 💬 `speech-delay` - Speech Delay Support
- ⚡ `adhd-behaviour` - ADHD & Behavior Support
- 📚 `dyslexia` - Dyslexia Support
- 👩‍🏫 `teachers` - Teachers & Educators
- 🏠 `general-parent-lounge` - General Parent Lounge

### Step 3: Verify

After seeding, you should see output like:
```
✅ MongoDB Connected
✅ Created room: autism-support
✅ Created room: speech-delay
...
🎉 Seeding complete!
   Created: 6 rooms
   Updated: 0 rooms
```

### Troubleshooting

**Error: MONGODB_URI is not defined**
- Make sure you have a `.env` file in the backend directory
- Add: `MONGODB_URI=your_mongodb_connection_string`

**Error: Cannot connect to MongoDB**
- Verify MongoDB is running
- Check your connection string is correct
- Ensure network/firewall allows the connection

**Rooms already exist**
- The script will update existing rooms if they have the same slug
- To start fresh, uncomment line 105 in `scripts/seedChatRooms.js`:
  ```javascript
  await ChatRoom.deleteMany({});
  ```

### Manual Verification

You can verify rooms were created by checking your MongoDB database:

```javascript
// In MongoDB shell or Compass
db.chatrooms.find({})
```

Or test via API:
```bash
curl http://localhost:8000/api/chat/rooms
```

## After Seeding

Once rooms are seeded, you can:
1. Access chat rooms via `/chat` or `/chat/:slug`
2. Users can join rooms and start chatting
3. Moderators can manage rooms via `/moderation`

