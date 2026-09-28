/**
 * DealIQ Centralized API Client
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') + '/api';

export class ApiError extends Error {
  public status: number;
  public data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new ApiError(
      'Unable to connect to the DealIQ server. Please check your network connection.',
      0
    );
  }

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body.detail) {
        if (typeof body.detail === 'string') {
          errorDetail = body.detail;
        } else if (Array.isArray(body.detail)) {
          errorDetail = body.detail.map((e: { msg?: string }) => e.msg || String(e)).join(', ');
        }
      } else if (body.message) {
        errorDetail = body.message;
      }
    } catch {
      // Body is not JSON
    }
    throw new ApiError(errorDetail, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
