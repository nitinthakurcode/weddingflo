import { RateLimitError } from './rate-limiter';

export interface AIError {
  message: string;
  type: 'rate_limit' | 'api_error' | 'validation_error' | 'unknown';
  retryable: boolean;
}

export function handleAIError(error: unknown): AIError {
  // Rate limit errors
  if (error instanceof RateLimitError) {
    return {
      message: error.message,
      type: 'rate_limit',
      retryable: true,
    };
  }

  // OpenAI API errors
  if (error && typeof error === 'object' && 'status' in error) {
    const apiError = error as { status?: number; message?: string };

    if (apiError.status === 429) {
      return {
        message: 'OpenAI API rate limit reached. Please try again later.',
        type: 'rate_limit',
        retryable: true,
      };
    }

    if (apiError.status === 401) {
      return {
        message: 'Invalid OpenAI API key. Please check configuration.',
        type: 'api_error',
        retryable: false,
      };
    }

    if (apiError.status === 400) {
      return {
        message: apiError.message || 'Invalid request to OpenAI API.',
        type: 'validation_error',
        retryable: false,
      };
    }

    if (apiError.status && apiError.status >= 500) {
      return {
        message: 'OpenAI API is experiencing issues. Please try again later.',
        type: 'api_error',
        retryable: true,
      };
    }
  }

  // Generic error
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  return {
    message,
    type: 'unknown',
    retryable: false,
  };
}
