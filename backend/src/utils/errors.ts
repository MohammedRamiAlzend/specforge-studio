export type ErrorCode =
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
    | "EMAIL_NOT_VERIFIED"
  | "SIGNUP_DOMAIN_NOT_ALLOWED"

  | "CODE_LOCKED"
  | "PLAN_LIMIT_REACHED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function badRequest(message: string, details?: unknown): AppError {
  return new AppError("BAD_REQUEST", message, 400, details);
}

export function notFound(message: string, details?: unknown): AppError {
  return new AppError("NOT_FOUND", message, 404, details);
}

export function conflict(message: string, details?: unknown): AppError {
  return new AppError("CONFLICT", message, 409, details);
}

export function unauthorized(message = "Authentication required."): AppError {
  return new AppError("UNAUTHORIZED", message, 401);
}

export function forbidden(message = "You do not have permission to perform this action."): AppError {
  return new AppError("FORBIDDEN", message, 403);
}

/** 402 Payment Required — a plan allowance was exceeded (billing lifecycle). */
export function planLimitReached(message: string, details?: unknown): AppError {
  return new AppError("PLAN_LIMIT_REACHED", message, 402, details);
}
