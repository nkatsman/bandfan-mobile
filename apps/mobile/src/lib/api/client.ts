import { z } from 'zod';

import { auth } from '../firebase';
import { env, hasApiBaseUrl } from '../env';

type ApiMethod = 'GET' | 'POST' | 'PATCH';
type AuthMode = 'none' | 'required';

type RequestOptions<TResponse> = {
  auth?: AuthMode;
  body?: unknown;
  headers?: Record<string, string>;
  method: ApiMethod;
  path: string;
  schema?: z.ZodType<TResponse>;
};

type ErrorCode = 'auth' | 'config' | 'http' | 'network' | 'validation';

type ParsedErrorBody = {
  code?: string;
  details?: unknown;
  message: string;
};

export class ApiClientError extends Error {
  code: ErrorCode;
  details?: unknown;
  status?: number;

  constructor(message: string, options: { code: ErrorCode; details?: unknown; status?: number }) {
    super(message);
    this.code = options.code;
    this.details = options.details;
    this.name = 'ApiClientError';
    this.status = options.status;
  }
}

function buildUrl(path: string) {
  if (!hasApiBaseUrl) {
    throw new ApiClientError('EXPO_PUBLIC_API_BASE_URL is missing. Configure the mobile app public API base before requesting backend data.', { code: 'config' });
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${env.apiBaseUrl}${normalizedPath}`;
}

async function getBearerToken() {
  if (!auth) {
    throw new ApiClientError('This request requires an authenticated Firebase session before the bearer token can be attached.', { code: 'auth' });
  }

  await auth.authStateReady();

  const user = auth.currentUser;

  if (!user) {
    throw new ApiClientError('This request requires an authenticated Firebase session before the bearer token can be attached.', { code: 'auth' });
  }

  try {
    return await user.getIdToken();
  } catch (error) {
    throw new ApiClientError('Failed to retrieve the Firebase bearer token for the request.', {
      code: 'auth',
      details: error,
    });
  }
}

function readMessage(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return readMessage(record.message) ?? readMessage(record.error) ?? readMessage(record.detail);
  }

  return undefined;
}

function readCode(value: unknown): string | undefined {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const rawCode = record.code;

    if (typeof rawCode === 'string' && rawCode.trim().length > 0) {
      return rawCode;
    }
  }

  return undefined;
}

function readDetails(value: unknown): unknown {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return record.details ?? record.errors ?? record.meta ?? value;
  }

  return value;
}

async function parseResponseBody(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : null;
}

function parseErrorBody(body: unknown, response: Response): ParsedErrorBody {
  return {
    code: readCode(body),
    details: readDetails(body),
    message: readMessage(body) ?? `Request failed with status ${response.status}.`,
  };
}

async function request<TResponse>({ auth: authMode = 'none', body, headers, method, path, schema }: RequestOptions<TResponse>) {
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (authMode === 'required') {
    requestHeaders.Authorization = `Bearer ${await getBearerToken()}`;
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: requestHeaders,
      method,
    });
  } catch (error) {
    throw new ApiClientError('Network request failed before the backend could respond.', {
      code: 'network',
      details: error,
    });
  }

  const parsedBody = await parseResponseBody(response);

  if (!response.ok) {
    const parsedError = parseErrorBody(parsedBody, response);

    throw new ApiClientError(parsedError.message, {
      code: 'http',
      details: parsedError.details,
      status: response.status,
    });
  }

  if (!schema) {
    return parsedBody as TResponse;
  }

  const validated = schema.safeParse(parsedBody);

  if (!validated.success) {
    throw new ApiClientError('Backend response did not match the expected mobile contract.', {
      code: 'validation',
      details: validated.error.flatten(),
      status: response.status,
    });
  }

  return validated.data;
}

export const apiClient = {
  getAuthed<TResponse>(path: string, options?: Omit<RequestOptions<TResponse>, 'auth' | 'method' | 'path'>) {
    return request<TResponse>({ ...options, auth: 'required', method: 'GET', path });
  },
  getPublic<TResponse>(path: string, options?: Omit<RequestOptions<TResponse>, 'auth' | 'method' | 'path'>) {
    return request<TResponse>({ ...options, auth: 'none', method: 'GET', path });
  },
  patchAuthed<TResponse>(path: string, options?: Omit<RequestOptions<TResponse>, 'auth' | 'method' | 'path'>) {
    return request<TResponse>({ ...options, auth: 'required', method: 'PATCH', path });
  },
  postAuthed<TResponse>(path: string, options?: Omit<RequestOptions<TResponse>, 'auth' | 'method' | 'path'>) {
    return request<TResponse>({ ...options, auth: 'required', method: 'POST', path });
  },
};