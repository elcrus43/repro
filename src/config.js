// Centralized API configuration
// Set VITE_API_URL in your .env file for production backend
// Example: VITE_API_URL=https://your-backend.railway.app
export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
