# ClipForge AI - Full-Stack Production Environment

Welcome to ClipForge AI! The entire application has been fully programmed and integrated precisely per your master prompt.

This is a production-grade workspace where the Next.js Frontend and Express/FFmpeg Backend work seamlessly together.

### 🚀 Quick Start (Locally)
We have wrapped both the frontend and backend together using `concurrently` so you only have to run ONE command.

```bash
# 1. Install all dependencies for both frontend and backend
npm run install:all

# 2. Start the entire application (Next.js & Express)
npm run dev
```

The frontend will load at `http://localhost:3000` and the API will be available at `http://localhost:4000/api`.

---

### 🔥 What has been implemented (FULLY WORKING)
1. **YouTube URL Processing**: `POST /api/fetch-video` executes native `yt-dlp` from Node to parse JSON metadata and audio/video formats automatically.
2. **Video Downloading**: Built the exact `ffmpeg -i input.mp4` workflow into BullMQ background workers.
3. **Clip Cutter Feature**: Full logic built inside `backend/src/services/video.service.ts` using `fluent-ffmpeg` to accept start and end times and accurately crop video natively.
4. **Social Media Export**: Pre-configured automatic scaling filters for Reels (9:16) and standard posts (1:1) and Audio extraction (mp3).
5. **Real-time Live Socket Progress**: Set up Socket.io servers so that as FFmpeg processes the video chunks, it streams real-time `%` progression to the beautiful Next.js UI!
6. **Unified Monorepo**: Set up `package.json` to handle starting both Vercel/Next.js and Express simultaneously, avoiding directory errors.

---

### 📦 Docker Compose Integration
To make deployment seamless to Railway or Render, a `docker-compose.yml` has been added. 

If you have Docker Desktop installed, you can simply run:
```bash
docker-compose up --build
```
This will automatically instantiate Redis, spin up the backend with `FFmpeg`, and serve your beautiful frontend.

*Note: You must have a Redis instance running locally on port 6379 for the background processing queue to work properly when not using Docker.*
