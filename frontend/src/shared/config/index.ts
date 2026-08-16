/**
 * Frontend runtime configuration.
 * API base URL: in dev the Vite server proxies /api to the backend workspace.
 * Override with VITE_API_BASE_URL (e.g. a deployed API origin).
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "/api";
