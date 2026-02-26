export class ApiError extends Error {
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(statusCode: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

const dbErrorCodes = new Set([
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "57P01",
  "57P03",
  "53300",
  "08001",
  "08006",
]);

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const pgError = error as { code?: string; message?: string };
  const code = pgError.code?.toUpperCase();
  const message = pgError.message?.toLowerCase() ?? "";

  return (
    (code ? dbErrorCodes.has(code) : false) ||
    message.includes("connection timeout") ||
    message.includes("timeout expired") ||
    message.includes("statement timeout") ||
    message.includes("terminating connection") ||
    message.includes("connection terminated unexpectedly")
  );
}
