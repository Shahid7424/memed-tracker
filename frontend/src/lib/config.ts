/** Base URL of the backend API, e.g. https://memed-api.onrender.com (no trailing slash). */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
