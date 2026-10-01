/**
 * FIXXY Module 8 — Orchestration Errors
 */

export class OrchestrationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'OrchestrationError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends OrchestrationError {
  constructor(message: string, details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends OrchestrationError {
  constructor(message: string = 'Authentication required') {
    super(401, 'AUTH_REQUIRED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends OrchestrationError {
  constructor(message: string = 'Forbidden: access denied') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends OrchestrationError {
  constructor(message: string = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends OrchestrationError {
  constructor(message: string = 'Conflict: action cannot be performed in current state') {
    super(409, 'CONFLICT', message);
    this.name = 'ConflictError';
  }
}

export class AiServiceError extends OrchestrationError {
  constructor(message: string = 'AI Diagnosis service is temporarily unavailable', details?: unknown) {
    super(503, 'AI_SERVICE_UNAVAILABLE', message, details);
    this.name = 'AiServiceError';
  }
}
