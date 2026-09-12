# GitHub Preparation Notes

This version is prepared for local development and GitHub publication.

## Canonical runtime

The current web application uses `server.ts` (Node + Express + Vite) as its integrated runtime. The React frontend calls its `/api/*` endpoints directly.

The Python `backend/` implementation is kept as an optional/reference FastAPI + FAISS backend. It is not required to run the current web UI.

## Gemini configuration

Set these in `.env`:

- `GEMINI_API_KEY`
- `GEMINI_GENERATION_MODEL` (default: `gemini-3.8-flash`)
- `GEMINI_EMBEDDING_MODEL` (default: `gemini-embedding-2-preview`)
- `GEMINI_THINKING_LEVEL` (default: `medium`)

Never commit `.env`.

## Local startup

1. `npm install`
2. Copy `.env.example` to `.env` and add the API key.
3. `npm run dev`
4. Open `http://localhost:3000`

The Python backend is optional:

1. `python -m venv .venv`
2. `.venv\\Scripts\\Activate.ps1` on Windows
3. `pip install -r backend/requirements.txt`
4. `uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload`

## Git safety

The repository ignores `.env`, `node_modules`, `.venv`, Python caches, build output, and logs.

Before the first commit, run `git status` and confirm no secret files or dependency directories are staged.
