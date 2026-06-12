# IdeaVault Server

Backend API for the IdeaVault startup idea sharing platform.

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB Atlas
- **Authentication:** Better Auth + JWT
- **Security:** JWT middleware for protected routes

## 📡 API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/ideas` | No | Get all ideas (supports search & filter) |
| GET | `/api/ideas/:id` | No | Get single idea |
| POST | `/api/ideas` | Yes | Create new idea |
| PUT | `/api/ideas/:id` | Yes | Update idea |
| DELETE | `/api/ideas/:id` | Yes | Delete idea |
| GET | `/api/comments/:ideaId` | No | Get comments for idea |
| POST | `/api/comments` | Yes | Add comment |
| PUT | `/api/comments/:id` | Yes | Update comment |
| DELETE | `/api/comments/:id` | Yes | Delete comment |
| GET | `/api/user-comments` | No | Get comments by user email |
| POST | `/api/jwt/token` | No | Generate JWT token |

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env` with your environment variables
4. Run development server: `npm run dev`
