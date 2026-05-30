// Retry + typed error for Mesa key persistence. Plain (non-"use server") module
// so it can export a value (the error class) and a helper used by the server
// actions in ./keys.ts.

/** Thrown when a Mesa key could not be persisted/read after retries. */
export class MesaKeyPersistenceError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "MesaKeyPersistenceError";
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  onRetry?: (error: unknown, attempt: number) => void;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Run `fn`, retrying on any thrown error with exponential backoff. Resolves with
 * the result on success; rethrows the LAST error after all attempts are
 * exhausted. Safe only for idempotent operations (our upserts are).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const attempts = options.attempts ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 150;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        options.onRetry?.(error, attempt);
        await sleep(baseDelayMs * 2 ** (attempt - 1));
      }
    }
  }
  throw lastError;
}
