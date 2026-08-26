import { API_BASE_URL } from "../config";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface Envelope<T> {
  data?: T;
  error?: { code?: string; message?: string };
}

/** Calls the backend and unwraps the { data } / { error } envelope. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(res.status, err?.code ?? "INTERNAL_ERROR", err?.message ?? res.statusText);
  }
  return body?.data as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}
