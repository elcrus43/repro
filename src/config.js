const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (
      hostname && 
      hostname !== 'localhost' && 
      hostname !== '127.0.0.1' && 
      !hostname.endsWith('.vercel.app')
    ) {
      return `http://${hostname}:8080`;
    }
  }
  return 'http://localhost:8080';
};

export const API_BASE = getApiBase();
