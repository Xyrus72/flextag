/**
 * Central runtime config for the frontend.
 *
 * The API base URL is used by BOTH the axios instance (services/api.js) and the
 * Socket.IO client (context/SocketContext.jsx) — they must always point at the
 * same origin, or the session cookie won't be shared with the websocket.
 *
 * Override per-environment with VITE_API_URL in a .env file.
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1643'
