# AI Web Augmenter

AI Web Augmenter is a production-shaped Chrome extension platform that turns webpages into an AI workspace for summaries, Q&A, resume matching, skill-gap analysis, interview prep, roadmaps, and learning notes.

## Project Structure

```text
client/
server/
extension/
```

Legacy prototype files remain in the root for compatibility, but the new implementation lives in the folders above.

## Folder Layout

- `client/`: React dashboard with Redux Toolkit and Tailwind CSS.
- `server/`: Express API, MongoDB models, JWT auth, and AI service layer.
- `extension/`: Chrome MV3 extension with content scripts, popup UI, and background worker.

## Installation Guide

1. Install Node.js 20+ and MongoDB locally, or prepare a MongoDB Atlas cluster.
2. Copy `.env.example` to `.env` and fill in the values.
3. Install root dependencies, then install dependencies inside `client` and `server`.
4. Start the server on port 4000.
5. Start the client on port 5173.
6. Load the `extension/` folder as an unpacked Chrome extension.

Example commands:

```bash
npm install
npm install --prefix client
npm install --prefix server
npm run dev:server
npm run dev:client
```

## Tech Stack

- Client: React, React Router, Redux Toolkit, Tailwind CSS, Vite
- Server: Node.js, Express, MongoDB, JWT, Zod, Multer, Mongoose
- Extension: Chrome Manifest V3, content scripts, background service worker, context menus
- AI: Gemini API with prompt templates and fallback heuristics

## Features

- AI webpage summarizer
- Webpage question answering
- Resume vs job description matcher
- Skill gap analysis
- Interview question generator
- Career roadmap generator
- AI notes generator
- Personal dashboard
- Authentication and protected routes
- Export-ready data model for PDF and search workflows

## Getting Started

1. Copy `.env.example` to `.env` and fill in the values.
2. Install dependencies in the root, then in `client` and `server`.
3. Run the server and client locally.

## Environment Variables

```bash
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/ai-web-augmenter
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-1.5-flash
CORS_ORIGIN=http://localhost:5173
```

## API Overview

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/ai/summaries`
- `POST /api/ai/questions`
- `POST /api/ai/match-resume`
- `POST /api/ai/skill-gap`
- `POST /api/ai/interview-questions`
- `POST /api/ai/roadmap`
- `POST /api/ai/notes`
- `POST /api/ai/resumes/upload`
- `GET /api/ai/resumes`
- `GET /api/ai/saved`
- `GET /api/dashboard/overview`
- `GET /api/dashboard/search?q=...`

## MongoDB Schemas

- `User`
- `Resume`
- `JobDescription`
- `Analysis`
- `InterviewQuestions`
- `Roadmap`
- `Notes`

## Deployment Guide

### Vercel

- Deploy the `client/` folder as the frontend project.
- Set `VITE_API_URL` to the Render backend URL.

### Render

- Deploy the `server/` folder as the API service.
- Set `PORT`, `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`, and `CORS_ORIGIN`.

### MongoDB Atlas

- Create a cluster, create a database user, and whitelist the backend host.
- Copy the connection string into `MONGODB_URI`.

### Chrome Extension

- Load `extension/` as an unpacked extension during development.
- Package the folder for distribution after configuring the production backend URL.

## API Notes

All protected routes require `Authorization: Bearer <token>`. The extension popup includes a token field so the same JWT can be reused for browser-side requests.

## Deployment

- Client: deploy `client` to Vercel.
- Server: deploy `server` to Render.
- Database: create a MongoDB Atlas cluster and set `MONGODB_URI`.
- Extension: load the `extension` folder as an unpacked extension during development, then package for distribution.

## Notes

The server uses fallback heuristic responses when `GEMINI_API_KEY` is not configured, so the product still works end to end in local development.
