import type {
  NetworkClient,
  NetworkResponse,
  NetworkRequestOptions,
  Optional,
} from '@sudobility/types';
import type { PlatformNetwork } from '@sudobility/di';

// Lazy load NetInfo to avoid crashes if native module is not linked
type NetInfoModule = typeof import('@react-native-community/netinfo');
type NetInfoState = import('@react-native-community/netinfo').NetInfoState;
let NetInfoModule: NetInfoModule | null = null;

function getNetInfo() {
  if (!NetInfoModule) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@react-native-community/netinfo');
      NetInfoModule = mod;
    } catch (e) {
      console.warn('NetInfo not available:', e);
    }
  }
  return NetInfoModule?.default ?? null;
}

/**
 * React Native Network Client implementing NetworkClient from @sudobility/types.
 * Uses React Native's built-in fetch and NetInfo for connectivity status.
 */
export class RNNetworkClient implements NetworkClient {
  private defaultTimeout: number;

  constructor(defaultTimeout: number = 30000) {
    this.defaultTimeout = defaultTimeout;
  }

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
        headers: options?.headers ?? undefined,
        body: this.prepareBody(options?.body),
        signal: controller.signal,
      };

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

  async get<T = unknown>(
    url: string,
    options?: Optional<Omit<NetworkRequestOptions, 'method' | 'body'>>
  ): Promise<NetworkResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

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
 * Network error with status code.
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
 * Implements PlatformNetwork from @sudobility/di.
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
    netInfo.fetch()
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

  async request(url: string, options: RequestInit): Promise<Response> {
    return fetch(url, options);
  }

  isOnline(): boolean {
    this.ensureInitialized();
    return this.isOnlineState;
  }

  watchNetworkStatus(callback: (isOnline: boolean) => void): () => void {
    this.ensureInitialized();
    this.listeners.add(callback);

    // Return cleanup function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Get detailed network information.
   */
  async getNetworkInfo(): Promise<NetInfoState | null> {
    const netInfo = getNetInfo();
    if (!netInfo) return null;
    return netInfo.fetch();
  }

  /**
   * Cleanup resources.
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
  }
}

// Singleton instances
export const rnNetworkClient = new RNNetworkClient();
export const rnNetworkService = new RNNetworkService();
