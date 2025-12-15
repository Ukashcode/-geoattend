// If we are in production (deployed), use the real backend URL.
// If we are local, use localhost:3001.
// We will set VITE_API_URL in Vercel later.

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default API_URL;