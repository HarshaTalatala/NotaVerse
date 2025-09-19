import { HttpRequest } from '@azure/functions';
import { ApiResponse } from '../types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message
  };
}

export function createErrorResponse(error: string, message?: string): ApiResponse<null> {
  return {
    success: false,
    error,
    message
  };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateRequired(obj: any, fields: string[]): void {
  for (const field of fields) {
    if (!obj[field] || (typeof obj[field] === 'string' && obj[field].trim() === '')) {
      throw new ValidationError(`${field} is required`);
    }
  }
}

export function parseQueryParams(request: HttpRequest) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);
  
  return {
    page: parseInt(params.get('page') || '1'),
    limit: Math.min(parseInt(params.get('limit') || '10'), 100),
    search: params.get('search') || '',
    sortBy: params.get('sortBy') || 'createdAt',
    sortOrder: params.get('sortOrder') || 'desc'
  };
}