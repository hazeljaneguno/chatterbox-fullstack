# Chatterbox — Full-stack real-time chat

React + Vite frontend, Express API, MongoDB persistence, Socket.IO real-time messages, and JWT authentication stored in an HTTP-only cookie.

## Requirements
- Node.js 20 or newer
- MongoDB Atlas account or a local MongoDB server
- Two browser sessions (for example, normal and incognito) to test two accounts

## Folder structure
```text
chatterbox-fullstack/
├── package.json
├── .gitignore
├── client/
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js
│       └── styles.css
└── server/
    ├── .env.example
    ├── package.json
    └── src/
        ├── server.js
        ├── config.js
        ├── middleware/
        │   └── requireAuth.js
        ├── models/
        │   ├── User.js
        │   └── Message.js
        ├── routes/
        │   ├── auth.js
        │   ├── users.js
        │   └── messages.js
        └── utils/
            └── socketAuth.js
```

## 1. Configure MongoDB
For MongoDB Atlas, create a database user and allow your current IP in Network Access. Copy the application's connection string. Do not commit it to GitHub.

## 2. Configure environment variables
Copy `server/.env.example` to `server/.env` and fill in:
- `MONGODB_URI`: your Atlas/local MongoDB URI
- `JWT_SECRET`: a long random secret (at least 32 characters)
- `CLIENT_URL`: normally `http://localhost:5173`
- `PORT`: normally `5000`

Copy `client/.env.example` to `client/.env`. For local development, use `VITE_API_URL=http://localhost:5000`.

## 3. Install and run
From the project root:
```bash
npm install
npm run install:all
npm run dev
```
Open `http://localhost:5173`. The API runs on `http://localhost:5000`.

If you prefer separate terminals:
```bash
cd server
npm install
npm run dev
```
and:
```bash
cd client
npm install
npm run dev
```

## 4. Test real-time chat
1. Register a user in one browser.
2. Open an incognito/private window or a second browser and register another user.
3. Search for the other username or email in the contacts panel and select them.
4. Send messages. Messages are stored in MongoDB and delivered in real time while both users are online.
5. Refresh either browser to confirm message history loads from MongoDB.

## Security notes
- Passwords are hashed with bcrypt.
- Authentication token is in an HTTP-only cookie, not localStorage.
- API and Socket.IO access require authentication.
- Messages can only be sent to registered users.
- For production, deploy the client and API with HTTPS, set `COOKIE_SECURE=true`, use a strong secret, and configure exact CORS origins.
- For a production app, consider email verification, password reset, abuse controls, rate limiting, monitoring, and backups.
- This demo intentionally implements one-to-one text chat. It does not yet include group chats, attachments, or end-to-end encryption.

## Deploying
Deploy the `client` as a static Vite site and `server` as a Node web service. Set `VITE_API_URL` to the public API origin in the client build environment. Set `CLIENT_URL` to the exact deployed frontend origin in the server environment. Since cookie authentication is cross-origin, use HTTPS and `COOKIE_SECURE=true`; `COOKIE_SAME_SITE=none` is required for cross-site deployments. A same-site custom domain arrangement is preferable. Do not use `*` for CORS origins.


### Editing messages

You can edit messages you sent using the **Edit** option below your own message. Save persists the updated text in MongoDB and broadcasts it to both participants over Socket.IO. Other users cannot edit your messages. Edited messages show an “edited” label.

## Frontend component structure

The React frontend is organized so the main `src/App.jsx` focuses on app state, API calls, Socket.IO events, and connecting the screen components.

- `client/src/components/AuthScreen.jsx` — login and signup UI.
- `client/src/components/Avatar.jsx` — reusable avatar, initials, and avatar colors.
- `client/src/components/MessageList.jsx` — renders conversation messages and the edit-message form.
- `client/src/api.js` — frontend requests and Socket.IO connection setup.
- `client/src/styles.css` — shared styling, including responsive layout and hidden scrollbars.

When adding another feature, create a component in `client/src/components/` when it has its own clear UI responsibility. Keep shared state and socket/API coordination in `App.jsx` until it becomes large enough to move into a custom hook.
