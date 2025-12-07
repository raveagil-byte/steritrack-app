# Backend Setup for SteriTrack

This directory contains the Express + MySQL backend for the SteriTrack application.

## Prerequisites
- Node.js (Installed)
- MySQL Server (Must be running, e.g. via Laragon, or standalone)

## Setup

1.  **Configure Database**:
    - Open `backend/.env` file.
    - Update `DB_USER` (usually `root`) and `DB_PASS` (usually empty or `root`) to match your local MySQL installation.
    - `DB_HOST` is set to `localhost`.

2.  **Install Dependencies** (Already done):
    ```bash
    cd backend
    npm install
    ```

3.  **Initialize Database**:
    - Start the server: `npm start` (or `node server.js`)
    - The server will attempt to create the `steritrack` database.
    - To load the schema and initial data, visit: `http://localhost:3000/init-db` in your browser once the server is running.

## Running the Server
```bash
cd backend
npm start
```
The server runs on port 3000.

## Connecting Frontend
To switch the frontend to use this backend:
1.  Ensure the backend is running.
2.  Update `App.tsx` to use `services/apiService.ts` instead of `services/storage.ts`.
    - Replace initial data loading `useEffect` with `ApiService` calls.
    - Update actions (add/create/delete) to call `ApiService` methods.
