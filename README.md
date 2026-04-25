# ✦ Vibe — Social Media Platform

> A full-stack social networking application built with React, Node.js/Express, and SQLite.

---

## 👤 Author

**Kushan Kumarasiri**
📧 [kushanlaksitha32@gmail.com](mailto:kushanlaksitha32@gmail.com)

---

## 📖 Description

**Vibe** is a modern, full-stack social media web application that enables users to communicate and engage in real time. The platform supports core social networking features including user authentication, post creation, likes, comments, threaded replies, reposts, and private chat functionality. Designed with a responsive dark-themed UI and efficient RESTful backend APIs, the application demonstrates modern web development practices, state management, and database integration in a scalable architecture.

---

## 🚀 Features

- 🔐 **User Authentication & Security** — Register, login, JWT-based sessions, and secure password changes
- 📝 **Rich Posts** — Create, view, and delete posts, including support for photo and video uploads
- ⏱️ **Real-time Timestamps** — Accurate local timestamps on all posts, comments, and messages
- ❤️ **Engagement** — Like posts, track unique post views (👁️), and live count updates
- 💬 **Comments & Replies** — Threaded reply system on any post
- 🔁 **Reposts** — Repost any post to share with followers
- 👥 **Follow System** — Follow/unfollow users, view detailed lists of followers and following on profiles
- 💌 **Private Chat** — Real-time direct messaging between users (polling-based)
- 🔔 **Notifications** — Like, reply, follow, and repost notifications
- 🏠 **Feed** — "For You" (trending) and "Following" feed tabs
- 🔍 **Explore** — Browse trending posts, search for users
- 👤 **Enhanced User Profiles** — Custom avatars and cover photos, full-size image viewer, bio, educational qualifications, and detailed stats
- 🛡️ **Media Privacy** — Server-side encryption for all uploaded images/videos with disabled right-click/download protections
- 📱 **Responsive UI** — Works flawlessly on desktop, tablet, and mobile devices

---

## 🛠 Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18, React Router v6, Axios  |
| Backend    | Node.js, Express.js               |
| Database   | SQLite (via better-sqlite3)       |
| Auth       | JWT (jsonwebtoken), bcryptjs      |
| Fonts      | Syne (display), DM Sans (body)    |
| Styling    | Custom CSS with CSS Variables     |

---

## 📁 Project Structure

```
social-app/
├── backend/
│   ├── db/
│   │   └── database.js        # SQLite schema & connection
│   ├── middleware/
│   │   └── auth.js            # JWT auth middleware
│   ├── routes/
│   │   ├── auth.js            # Register, login, profile
│   │   ├── users.js           # Follow, search, suggestions
│   │   ├── posts.js           # CRUD, likes, reposts, replies
│   │   ├── chat.js            # Conversations & messages
│   │   └── notifications.js   # Notifications
│   ├── server.js              # Express app entry point
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.js         # Navigation sidebar
│   │   │   ├── PostCard.js        # Post display component
│   │   │   ├── ComposeModal.js    # New post / reply modal
│   │   │   └── RightPanel.js      # Search & suggestions
│   │   ├── context/
│   │   │   └── AuthContext.js     # Global auth state
│   │   ├── pages/
│   │   │   ├── Home.js            # Feed page
│   │   │   ├── Explore.js         # Trending posts
│   │   │   ├── Profile.js         # User profile
│   │   │   ├── PostDetail.js      # Single post + replies
│   │   │   ├── Messages.js        # Chat interface
│   │   │   ├── Notifications.js   # Notifications list
│   │   │   ├── Login.js
│   │   │   └── Register.js
│   │   ├── utils/
│   │   │   └── api.js             # Axios instance
│   │   ├── App.js                 # Routes & layout
│   │   ├── index.js               # React entry
│   │   └── index.css              # Global styles & design system
│   └── package.json
│
├── start.sh                   # One-command startup script (Linux/macOS)
├── start.bat                  # One-command startup script (Windows)
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher
- npm (comes with Node.js)

### 1. Clone or extract the project

```bash
unzip vibe-social-app.zip
cd social-app
```

### 2. Install backend dependencies

```bash
cd backend
npm install
cd ..
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Start the backend server

```bash
cd backend
npm start
# Server runs on http://localhost:5000
```

### 5. Start the frontend (in a new terminal)

```bash
cd frontend
npm start
# App opens at http://localhost:3000
```

### 6. Or use the one-command script

**Linux/macOS:**
```bash
chmod +x start.sh
./start.sh
```

**Windows:**
```bat
start.bat
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts/feed` | Following feed |
| GET | `/api/posts/explore` | Trending posts |
| POST | `/api/posts` | Create post or reply |
| GET | `/api/posts/:id` | Get single post |
| GET | `/api/posts/:id/replies` | Get replies |
| POST | `/api/posts/:id/like` | Like / unlike |
| POST | `/api/posts/:id/repost` | Repost / undo repost |
| DELETE | `/api/posts/:id` | Delete post |
| GET | `/api/posts/user/:userId` | User's posts |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/search?q=` | Search users |
| GET | `/api/users/suggestions` | Who to follow |
| GET | `/api/users/:username` | Get profile |
| POST | `/api/users/:id/follow` | Follow / unfollow |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/conversations` | List conversations |
| POST | `/api/chat/conversations/:userId` | Start/get conversation |
| GET | `/api/chat/conversations/:id/messages` | Get messages |
| POST | `/api/chat/conversations/:id/messages` | Send message |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get notifications |
| PUT | `/api/notifications/read` | Mark all read |
| GET | `/api/notifications/unread-count` | Unread count |

---

## 🗄 Database Schema

The SQLite database (`backend/db/social.db`) is auto-created on first run with the following tables:

- **users** — id, username, display_name, email, password, bio, avatar, follower/following counts
- **follows** — follower_id, following_id
- **posts** — id, user_id, content, image, likes/comments/reposts counts, parent_id (replies), repost_of
- **likes** — user_id, post_id
- **reposts** — user_id, post_id
- **conversations** — id, user1_id, user2_id, last_message
- **messages** — id, conversation_id, sender_id, content, read
- **notifications** — id, user_id, actor_id, type, post_id, read

---

## 🔒 Environment Variables

You can optionally create a `.env` file in `backend/`:

```env
PORT=5000
JWT_SECRET=your_super_secret_key_here
```

---

## 📸 UI Overview

- **Dark theme** with a purple/violet accent palette
- **Syne** display font for headings and branding
- **DM Sans** body font for readability
- Three-column layout: Sidebar navigation | Main feed | Right panel (search & suggestions)
- Responsive down to mobile with collapsible sidebar

### Screenshots

**Home Feed**
![Home Feed](screenshots/homepage.png)

**User Profile**
![Profile](screenshots/profile.png)

**Edit Profile**
![Edit Profile](screenshots/edit-profile.png)

**Notifications**
![Notifications](screenshots/notification.png)

**Login & Register**
<p float="left">
  <img src="screenshots/login.png" width="49%" />
  <img src="screenshots/register.png" width="49%" />
</p>

---

## 📄 License

MIT License — Free to use, modify, and distribute.

---

*Built with ❤️ by Kushan Kumarasiri*
