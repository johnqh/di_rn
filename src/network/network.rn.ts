import type {
  NetworkClient,
  NetworkResponse,
  NetworkRequestOptions,
  Optional,
} from '@sudobility/types';
import type { PlatformNetwork } from '@sudobility/di/interfaces';

// Lazy load NetInfo to avoid crashes if native module is not linked
type NetInfoModuleType = typeof import('@react-native-community/netinfo');
type NetInfoState = import('@react-native-community/netinfo').NetInfoState;
let netInfoModule: NetInfoModuleType | null = null;
let netInfoOverride: NetInfoModuleType['default'] | null = null;

/**
 * Inject a mock or custom NetInfo module for testing.
 *
 * @param netInfo - The NetInfo default export to use, or `null` to reset and use the real module.
 *
 * @example
 * ```ts
 * // In tests:
 * setNetInfoModule(mockNetInfo);
 * ```
 */
export function setNetInfoModule(
  netInfo: NetInfoModuleType['default'] | null
): void {
  netInfoOverride = netInfo;
}

/**
 * Lazily load and return the NetInfo native module's default export.
 *
 * Uses `require()` inside a try-catch to avoid crashes when the native module
 * is not linked. The module is cached after the first successful load.
 *
 * @returns The NetInfo default export, or `null` if not available.
 */
function getNetInfo(): NetInfoModuleType['default'] | null {
  if (netInfoOverride) return netInfoOverride;

  if (!netInfoModule) {
    try {
      const mod: NetInfoModuleType = require('@react-native-community/netinfo');
      netInfoModule = mod;
    } catch (e) {
      console.warn('NetInfo not available:', e);
    }
  }
  return netInfoModule?.default ?? null;
}

/**
 * React Native Network Client implementing `NetworkClient` from `@sudobility/types`.
 *
 * Uses React Native's built-in `fetch` with configurable timeout and `AbortController`
 * for request cancellation.
 *
 * @example
 * ```ts
 * const client = new RNNetworkClient(15000); // 15s timeout
 * const response = await client.get<User[]>('https://api.example.com/users');
 * if (response.ok) {
 *   console.log(response.data);
 * }
 * ```
 */
export class RNNetworkClient implements NetworkClient {
  private defaultTimeout: number;

  /**
   * Create a new RNNetworkClient.
   *
   * @param defaultTimeout - Default request timeout in milliseconds. Defaults to 30000 (30s).
   */
  constructor(defaultTimeout: number = 30000) {
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Make an HTTP request with automatic timeout handling.
   *
   * @typeParam T - The expected response data type.
   * @param url - The request URL.
   * @param options - Optional request options (method, headers, body, timeout).
   * @returns A `NetworkResponse` containing the parsed response data and metadata.
   * @throws NetworkError if the request times out (status 408).
   * @throws Error for other network failures.
   *
   * @example
   * ```ts
   * const res = await client.request<{ id: string }>('/api/item', {
   *   method: 'POST',
   *   body: '{"name":"test"}',
   *   headers: { 'Content-Type': 'application/json' },
   * });
   * ```
   */
  async request<T = unknown>(
    url: string,
    options?: Optional<NetworkRequestOptions>
  ): Promise<NetworkResponse<T>> {
    const timeout = options?.timeout ?? this.defaultTimeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method: options?.method ?? 'GET',
        signal: controller.signal,
      };
      if (options?.headers) {
        fetchOptions.headers = options.headers;
      }
      const preparedBody = this.prepareBody(options?.body);
      if (preparedBody !== undefined) {
        fetchOptions.body = preparedBody;
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      const data = await this.parseResponse<T>(response);

      return {
        success: response.ok,
        data,
        timestamp: new Date().toISOString(),
        status: response.status,
        statusText: response.statusText,
        headers: this.parseHeaders(response.headers),
        ok: response.ok,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError('Request timeout', 408, 'Request Timeout');
      }

      throw error;
    }
  }

  /**
   * Make an HTTP GET request.
   *
   * @typeParam T - The expected response data type.
   * @param url - The request URL.
   * @param options - Optional request options (headers, timeout).
   * @returns A `NetworkResponse` containing the parsed response data.
   */
  async get<T = unknown>(
    url: string,
    options?: Optional<Omit<NetworkRequestOptions, 'method' | 'body'>>
  ): Promise<NetworkResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * Make an HTTP POST request.
   *
   * @typeParam T - The expected response data type.
   * @param url - The request URL.
   * @param body - Optional request body (objects are JSON-serialized).
   * @param options - Optional request options (headers, timeout).
   * @returns A `NetworkResponse` containing the parsed response data.
   */
  async post<T = unknown>(
    url: string,
    body?: Optional<unknown>,
    options?: Optional<Omit<NetworkRequestOptions, 'method'>>
  ): Promise<NetworkResponse<T>> {
    const bodyToSend = this.convertBody(body);
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: bodyToSend,
    });
  }

  /**
   * Make an HTTP PUT request.
   *
   * @typeParam T - The expected response data type.
   * @param url - The request URL.
   * @param body - Optional request body (objects are JSON-serialized).
   * @param options - Optional request options (headers, timeout).
   * @returns A `NetworkResponse` containing the parsed response data.
   */
  async put<T = unknown>(
    url: string,
    body?: Optional<unknown>,
    options?: Optional<Omit<NetworkRequestOptions, 'method'>>
  ): Promise<NetworkResponse<T>> {
    const bodyToSend = this.convertBody(body);
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: bodyToSend,
    });
  }

  /**
   * Make an HTTP DELETE request.
   *
   * @typeParam T - The expected response data type.
   * @param url - The request URL.
   * @param options - Optional request options (headers, timeout).
   * @returns A `NetworkResponse` containing the parsed response data.
   */
  async delete<T = unknown>(
    url: string,
    options?: Optional<Omit<NetworkRequestOptions, 'method' | 'body'>>
  ): Promise<NetworkResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  private convertBody(
    body: Optional<unknown>
  ): Optional<string | FormData | Blob> {
    if (body === null || body === undefined) return undefined;
    if (typeof body === 'string') return body;
    if (body instanceof FormData || body instanceof Blob) return body;
    return JSON.stringify(body);
  }

  private prepareBody(
    body?: Optional<string | FormData | Blob>
  ): string | FormData | Blob | undefined {
    if (!body) return undefined;
    return body;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    if (contentType.includes('text/')) {
      return response.text() as unknown as T;
    }

    // For other content types, return as blob
    return response.blob() as unknown as T;
  }

  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value: string, key: string) => {
      result[key] = value;
    });
    return result;
  }
}

/**
 * Network error with HTTP status code and status text.
 *
 * Thrown by `RNNetworkClient` when a request times out or encounters
 * an HTTP-level error.
 *
 * @example
 * ```ts
 * try {
 *   await client.get('/api/data');
 * } catch (err) {
 *   if (err instanceof NetworkError) {
 *     console.log(err.status, err.statusText);
 *   }
 * }
 * ```
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * React Native Network Service with connectivity monitoring.
 *
 * Implements `PlatformNetwork` from `@sudobility/di/interfaces`.
 * Uses `@react-native-community/netinfo` for online/offline status detection.
 * Initialization of network monitoring is deferred until first use via
 * `ensureInitialized()` to avoid native module issues at import time.
 *
 * @example
 * ```ts
 * const service = new RNNetworkService();
 * console.log(service.isOnline()); // true
 *
 * const unsubscribe = service.watchNetworkStatus((isOnline) => {
 *   console.log('Network status:', isOnline);
 * });
 * // Later: unsubscribe();
 * ```
 */
export class RNNetworkService implements PlatformNetwork {
  private isOnlineState: boolean = true;
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private unsubscribe: (() => void) | null = null;
  private initialized: boolean = false;

  constructor() {
    // Defer initialization to avoid native module issues at load time
  }

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.initializeNetworkMonitoring();
  }

  private initializeNetworkMonitoring(): void {
    const netInfo = getNetInfo();
    if (!netInfo) return;

    // Get initial state
    netInfo
      .fetch()
      .then((state: NetInfoState) => {
        this.updateOnlineState(state);
      })
      .catch(() => {
        // Silently handle initialization errors
      });

    // Subscribe to changes
    this.unsubscribe = netInfo.addEventListener((state: NetInfoState) => {
      this.updateOnlineState(state);
    });
  }

  private updateOnlineState(state: NetInfoState): void {
    const isOnline =
      state.isConnected === true && state.isInternetReachable !== false;

    if (this.isOnlineState !== isOnline) {
      this.isOnlineState = isOnline;
      this.notifyListeners(isOnline);
    }
  }

  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach((listener) => listener(isOnline));
  }

  /**
   * Make a raw HTTP request using `fetch`.
   *
   * @param url - The request URL.
   * @param options - Optional `RequestInit` options.
   * @returns The raw `Response` object.
   */
  async request(url: string, options?: RequestInit): Promise<Response> {
    return fetch(url, options);
  }

  /**
   * Make an HTTP GET request.
   *
   * @param url - The request URL.
   * @param options - Optional headers and abort signal.
   * @returns The raw `Response` object.
   */
  async get(
    url: string,
    options?: { headers?: Record<string, string>; signal?: AbortSignal }
  ): Promise<Response> {
    const init: RequestInit = { method: 'GET' };
    if (options?.headers) init.headers = options.headers;
    if (options?.signal) init.signal = options.signal;
    return this.request(url, init);
  }

  /**
   * Make an HTTP POST request.
   *
   * @param url - The request URL.
   * @param body - Optional request body (objects are JSON-serialized).
   * @param options - Optional headers and abort signal.
   * @returns The raw `Response` object.
   */
  async post(
    url: string,
    body?: unknown,
    options?: { headers?: Record<string, string>; signal?: AbortSignal }
  ): Promise<Response> {
    const init: RequestInit = { method: 'POST' };
    if (options?.headers) init.headers = options.headers;
    if (options?.signal) init.signal = options.signal;
    if (body) init.body = JSON.stringify(body);
    return this.request(url, init);
  }

  /**
   * Make an HTTP PUT request.
   *
   * @param url - The request URL.
   * @param body - Optional request body (objects are JSON-serialized).
   * @param options - Optional headers and abort signal.
   * @returns The raw `Response` object.
   */
  async put(
    url: string,
    body?: unknown,
    options?: { headers?: Record<string, string>; signal?: AbortSignal }
  ): Promise<Response> {
    const init: RequestInit = { method: 'PUT' };
    if (options?.headers) init.headers = options.headers;
    if (options?.signal) init.signal = options.signal;
    if (body) init.body = JSON.stringify(body);
    return this.request(url, init);
  }

  /**
   * Make an HTTP DELETE request.
   *
   * @param url - The request URL.
   * @param options - Optional headers and abort signal.
   * @returns The raw `Response` object.
   */
  async delete(
    url: string,
    options?: { headers?: Record<string, string>; signal?: AbortSignal }
  ): Promise<Response> {
    const init: RequestInit = { method: 'DELETE' };
    if (options?.headers) init.headers = options.headers;
    if (options?.signal) init.signal = options.signal;
    return this.request(url, init);
  }

  /**
   * Check if the device is currently online.
   *
   * Triggers deferred initialization on first call.
   *
   * @returns `true` if the device is connected to the internet.
   */
  isOnline(): boolean {
    this.ensureInitialized();
    return this.isOnlineState;
  }

  /**
   * Subscribe to network status changes.
   *
   * Triggers deferred initialization on first call.
   *
   * @param callback - Function invoked with `true` (online) or `false` (offline) on status changes.
   * @returns An unsubscribe function to remove the listener.
   *
   * @example
   * ```ts
   * const unsub = service.watchNetworkStatus((online) => {
   *   console.log('Online:', online);
   * });
   * // Later: unsub();
   * ```
   */
  watchNetworkStatus(callback: (isOnline: boolean) => void): () => void {
    this.ensureInitialized();
    this.listeners.add(callback);

    // Return cleanup function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Get detailed network information from NetInfo.
   *
   * @returns The `NetInfoState` object, or `null` if NetInfo is unavailable.
   */
  async getNetworkInfo(): Promise<NetInfoState | null> {
    const netInfo = getNetInfo();
    if (!netInfo) return null;
    return netInfo.fetch();
  }

  /**
   * Cleanup resources: remove native listeners and clear subscriber set.
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
    this.initialized = false;
  }
}

// Singleton instances
export const rnNetworkClient = new RNNetworkClient();
export const rnNetworkService = new RNNetworkService();
