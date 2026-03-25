export class ApiError extends Error {
  constructor(
    public code: string,
    public httpStatus: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(code: string, message: string) {
    super(code, 400, message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(code: string, message: string) {
    super(code, 404, message);
    this.name = 'NotFoundError';
  }
}

export class ExtractionError extends ApiError {
  constructor(
    code: string,
    message: string,
    public url?: string,
    details?: Record<string, unknown>
  ) {
    super(code, 500, message, details);
    this.name = 'ExtractionError';
  }
}
