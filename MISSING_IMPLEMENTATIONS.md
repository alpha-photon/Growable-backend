# Missing Implementations & Next Steps

This document tracks what has been implemented and what still needs to be done for the real-time chat system.

## ✅ Completed Backend

### Models
- ✅ ChatRoom model (pinned messages, resources, moderators, expert tips)
- ✅ ChatMessage model (text, image, voice, system messages, threaded replies)
- ✅ UserPresence model (online status, typing indicators)
- ✅ ModerationLog model (all moderation actions)
- ✅ RoomMetrics model (usage analytics)
- ✅ UserBadge model (community badges)
- ✅ UserMute model (mute/ban tracking)
- ✅ NotificationSettings model (push notifications, muted rooms)

### Services
- ✅ Chat service (join/leave, send message, threaded replies, reactions, upvotes)
- ✅ Chat moderation service (delete, warn, ban, mute, pin, report, approve/reject)
- ✅ Auto-moderation (profanity filter, rate limiting, medical keyword flagging)
- ✅ Anonymous auth service

### Socket.io
- ✅ Socket.io server integration
- ✅ Real-time messaging
- ✅ Typing indicators
- ✅ Presence tracking (online users)
- ✅ Join/leave events
- ✅ Message reactions
- ✅ Upvotes

### Routes & Controllers
- ✅ Chat routes (rooms, messages, presence, pinned resources, expert tips)
- ✅ Chat moderation routes (moderator actions, flagged messages, logs)
- ✅ Anonymous auth endpoints

### Utilities
- ✅ Chat moderation utilities (profanity, medical keywords, rate limiting)
- ✅ Seed script for pre-created rooms

### Updates
- ✅ User model updated for anonymous users, badges, chat fields
- ✅ Server.js updated with Socket.io and HTTP server

## ⚠️ Missing Backend

1. **Voice note upload endpoint** - Need to add voice file upload (max 30s, store locally)
2. **Image upload for chat** - Need to update upload routes for chat images (2MB limit)
3. **Time sync endpoint** - Server time endpoint for client-server sync
4. **Room metrics collection** - Background job to collect daily metrics
5. **Badge awarding system** - Automatic badge assignment based on upvotes/activity
6. **Cookie parser middleware** - For HttpOnly cookie support in Express

## 🔨 Frontend TODO

### Core Chat Components
1. ChatRoom page component
2. MessageList component with virtualization
3. MessageInput component (text, image, voice)
4. ThreadView component for threaded replies
5. Message component with reactions, upvotes, timestamps

### Socket.io Integration
1. Socket.io client service
2. Custom hooks (useSocket, useChatRoom, useTyping)
3. Real-time message updates
4. Presence tracking
5. Typing indicators

### Features
1. Room sidebar with room list
2. Pinned resources panel (right sidebar)
3. Pinned messages display
4. Expert tip banner
5. Disclaimer/rules banner
6. Question filter (show only questions)
7. Message reactions UI
8. Upvote button
9. Threaded replies UI

### Authentication
1. Anonymous user modal/flow
2. Rules acceptance modal
3. Profile page updates (badges, role display)
4. HttpOnly cookie handling

### Moderation
1. Moderation dashboard
2. Flagged messages queue
3. Report message modal
4. Moderator actions menu

### Notifications
1. Browser push notification setup (service worker)
2. In-app unread badges
3. Notification settings page

### Additional
1. Time sync utility
2. Message pagination (cursor-based)
3. Image/voice upload UI
4. Typing indicator animation
5. Online users list
6. Room description/topic display

## 📝 Notes

- Voice notes should be stored locally (not Cloudinary) - limit 30s, format: webm/mp3
- Images for chat should have 2MB limit (different from post images)
- Consider using Redis for rate limiting in production
- Room metrics should be collected daily via cron job
- Badge system should automatically award based on thresholds

