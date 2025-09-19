export type DomainErrorCode =
  | 'ERR_VALIDATION'
  | 'ERR_NOT_FOUND'
  | 'ERR_FORBIDDEN'
  | 'ERR_DEPENDENCY'
  | 'ERR_PRECONDITION'
  | 'ERR_UNKNOWN';

export class DomainError extends Error {
  code: DomainErrorCode;
  meta?: unknown;
  constructor(code: DomainErrorCode, message: string, meta?: unknown) {
    super(message);
    this.code = code;
    this.meta = meta;
    this.name = 'DomainError';
  }
}

export function toDomainError(e: unknown): DomainError {
  if (e instanceof DomainError) return e;
  if (e instanceof Error) return new DomainError('ERR_UNKNOWN', e.message);
  return new DomainError('ERR_UNKNOWN', 'Unknown error');
}