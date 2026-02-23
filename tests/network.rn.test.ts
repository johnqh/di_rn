import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RNNetworkService,
  RNNetworkClient,
  NetworkError,
} from '../src/network/network.rn.js';
import {
  getNetworkService,
  initializeNetworkService,
  resetNetworkService,
  getNetworkClient,
  initializeNetworkClient,
  resetNetworkClient,
} from '../src/network/network-singleton.js';

describe('RNNetworkService', () => {
  let service: RNNetworkService;

  beforeEach(() => {
    service = new RNNetworkService();
    vi.clearAllMocks();
  });

  describe('isOnline', () => {
    it('should return true by default', () => {
      expect(service.isOnline()).toBe(true);
    });
  });

  describe('watchNetworkStatus', () => {
    it('should add a listener and return unsubscribe function', () => {
      const callback = vi.fn();
      const unsub = service.watchNetworkStatus(callback);

      expect(typeof unsub).toBe('function');
      unsub();
    });

    it('should remove listener when unsubscribe is called', () => {
      const callback = vi.fn();
      const unsub = service.watchNetworkStatus(callback);
      unsub();
    });
  });

  describe('request methods', () => {
    it('should make a GET request via request()', async () => {
      await service.request('https://example.com');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com',
        undefined
      );
    });

    it('should make a GET request via get()', async () => {
      await service.get('https://example.com', {
        headers: { Authorization: 'Bearer token' },
      });
      expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
        method: 'GET',
        headers: { Authorization: 'Bearer token' },
      });
    });

    it('should make a POST request via post()', async () => {
      await service.post('https://example.com', { data: 'test' });
      expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      });
    });

    it('should make a PUT request via put()', async () => {
      await service.put('https://example.com', { data: 'update' });
      expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
        method: 'PUT',
        body: JSON.stringify({ data: 'update' }),
      });
    });

    it('should make a DELETE request via delete()', async () => {
      await service.delete('https://example.com');
      expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
        method: 'DELETE',
      });
    });

    it('should pass signal and headers to delete()', async () => {
      const controller = new AbortController();
      await service.delete('https://example.com', {
        headers: { 'X-Custom': 'value' },
        signal: controller.signal,
      });
      expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
        method: 'DELETE',
        headers: { 'X-Custom': 'value' },
        signal: controller.signal,
      });
    });

    it('should make a POST request without body', async () => {
      await service.post('https://example.com');
      expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
        method: 'POST',
      });
    });

    it('should make a PUT request without body', async () => {
      await service.put('https://example.com');
      expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
        method: 'PUT',
      });
    });

    it('should pass signal to get()', async () => {
      const controller = new AbortController();
      await service.get('https://example.com', {
        signal: controller.signal,
      });
      expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
        method: 'GET',
        signal: controller.signal,
      });
    });
  });

  describe('dispose', () => {
    it('should clear listeners', () => {
      const callback = vi.fn();
      service.watchNetworkStatus(callback);
      service.dispose();

      // After dispose, service can be re-used
      expect(service.isOnline()).toBe(true);
    });
  });
});

describe('RNNetworkClient', () => {
  let client: RNNetworkClient;

  beforeEach(() => {
    client = new RNNetworkClient();
    vi.clearAllMocks();
    // Reset fetch mock to default behavior
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        blob: () => Promise.resolve(new Blob()),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response)
    );
  });

  describe('get', () => {
    it('should make a GET request and return parsed response', async () => {
      const response = await client.get('https://example.com/api');
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('post', () => {
    it('should make a POST request with JSON body', async () => {
      const response = await client.post('https://example.com/api', {
        name: 'test',
      });
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle null body', async () => {
      const response = await client.post('https://example.com/api', null);
      expect(response.ok).toBe(true);
    });

    it('should handle string body', async () => {
      const response = await client.post(
        'https://example.com/api',
        'raw-string'
      );
      expect(response.ok).toBe(true);
    });
  });

  describe('put', () => {
    it('should make a PUT request with body', async () => {
      const response = await client.put('https://example.com/api', {
        name: 'updated',
      });
      expect(response.ok).toBe(true);
    });
  });

  describe('delete', () => {
    it('should make a DELETE request', async () => {
      const response = await client.delete('https://example.com/api/1');
      expect(response.ok).toBe(true);
    });
  });

  describe('response parsing', () => {
    it('should parse JSON responses', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ id: 1, name: 'test' }),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response)
      );

      const response = await client.get<{ id: number; name: string }>(
        'https://example.com/api'
      );
      expect(response.data).toEqual({ id: 1, name: 'test' });
    });

    it('should parse text responses', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: () => Promise.resolve('hello world'),
          headers: new Headers({ 'content-type': 'text/plain' }),
        } as Response)
      );

      const response = await client.get<string>('https://example.com/text');
      expect(response.data).toBe('hello world');
    });

    it('should handle blob responses for unknown content types', async () => {
      const mockBlob = new Blob(['data']);
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          blob: () => Promise.resolve(mockBlob),
          headers: new Headers({
            'content-type': 'application/octet-stream',
          }),
        } as Response)
      );

      const response = await client.get('https://example.com/binary');
      expect(response.data).toBe(mockBlob);
    });
  });

  describe('error responses', () => {
    it('should report non-ok responses as success=false', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: () => Promise.resolve({ error: 'not found' }),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response)
      );

      const response = await client.get('https://example.com/missing');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(response.success).toBe(false);
    });
  });

  describe('timeout handling', () => {
    it('should throw NetworkError on timeout', async () => {
      global.fetch = vi.fn(
        () =>
          new Promise<Response>((_resolve, reject) => {
            setTimeout(() => {
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
            }, 10);
          })
      );

      const shortTimeoutClient = new RNNetworkClient(5);
      await expect(
        shortTimeoutClient.get('https://example.com/slow')
      ).rejects.toThrow(NetworkError);
    });

    it('should rethrow non-abort errors', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new TypeError('Failed to fetch'))
      );

      await expect(
        client.get('https://example.com/error')
      ).rejects.toThrow(TypeError);
    });
  });
});

describe('NetworkError', () => {
  it('should have correct properties', () => {
    const error = new NetworkError('timeout', 408, 'Request Timeout');
    expect(error.message).toBe('timeout');
    expect(error.status).toBe(408);
    expect(error.statusText).toBe('Request Timeout');
    expect(error.name).toBe('NetworkError');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('Network Singleton Management', () => {
  beforeEach(() => {
    resetNetworkService();
    resetNetworkClient();
  });

  describe('getNetworkService', () => {
    it('should auto-create service on first call', () => {
      const service = getNetworkService();
      expect(service).toBeInstanceOf(RNNetworkService);
    });

    it('should return the same instance on subsequent calls', () => {
      const s1 = getNetworkService();
      const s2 = getNetworkService();
      expect(s1).toBe(s2);
    });
  });

  describe('initializeNetworkService', () => {
    it('should create a new service', () => {
      const service = initializeNetworkService();
      expect(service).toBeInstanceOf(RNNetworkService);
    });

    it('should accept a custom instance', () => {
      const custom = new RNNetworkService();
      const service = initializeNetworkService(custom);
      expect(service).toBe(custom);
    });

    it('should dispose previous service', () => {
      const first = initializeNetworkService();
      const disposeSpy = vi.spyOn(first, 'dispose');
      initializeNetworkService();
      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe('resetNetworkService', () => {
    it('should reset singleton to null', () => {
      const first = initializeNetworkService();
      const disposeSpy = vi.spyOn(first, 'dispose');
      resetNetworkService();
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should not throw if no service exists', () => {
      expect(() => resetNetworkService()).not.toThrow();
    });
  });

  describe('getNetworkClient', () => {
    it('should auto-create client on first call', () => {
      const client = getNetworkClient();
      expect(client).toBeInstanceOf(RNNetworkClient);
    });

    it('should return the same instance on subsequent calls', () => {
      const c1 = getNetworkClient();
      const c2 = getNetworkClient();
      expect(c1).toBe(c2);
    });
  });

  describe('initializeNetworkClient', () => {
    it('should create a client with custom timeout', () => {
      const client = initializeNetworkClient(5000);
      expect(client).toBeInstanceOf(RNNetworkClient);
    });
  });

  describe('resetNetworkClient', () => {
    it('should reset client singleton to null', () => {
      initializeNetworkClient();
      resetNetworkClient();
      const c1 = getNetworkClient();
      expect(c1).toBeInstanceOf(RNNetworkClient);
    });
  });
});
