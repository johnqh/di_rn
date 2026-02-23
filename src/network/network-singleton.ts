import { RNNetworkService, RNNetworkClient } from './network.rn.js';

// Singleton management for network service
let networkService: RNNetworkService | null = null;
let networkClient: RNNetworkClient | null = null;

/**
 * Get the network service singleton, auto-creating one if not yet initialized.
 *
 * @returns The `RNNetworkService` singleton instance.
 *
 * @example
 * ```ts
 * const network = getNetworkService();
 * if (network.isOnline()) {
 *   // proceed with network request
 * }
 * ```
 */
export function getNetworkService(): RNNetworkService {
  if (!networkService) {
    networkService = new RNNetworkService();
  }
  return networkService;
}

/**
 * Initialize the network service singleton, optionally injecting a custom instance.
 *
 * If a previous singleton exists, it is disposed before replacement.
 *
 * @param service - Optional custom `RNNetworkService` instance. If omitted, a new one is created.
 * @returns The initialized `RNNetworkService` singleton.
 *
 * @example
 * ```ts
 * initializeNetworkService();
 * // Or with a custom instance:
 * initializeNetworkService(new RNNetworkService());
 * ```
 */
export function initializeNetworkService(
  service?: RNNetworkService
): RNNetworkService {
  if (networkService) {
    networkService.dispose();
  }
  networkService = service ?? new RNNetworkService();
  return networkService;
}

/**
 * Reset the network service singleton to `null`.
 *
 * Disposes the current instance if one exists, removing native event listeners.
 *
 * @example
 * ```ts
 * resetNetworkService();
 * ```
 */
export function resetNetworkService(): void {
  if (networkService) {
    networkService.dispose();
    networkService = null;
  }
}

/**
 * Get the network client singleton, auto-creating one if not yet initialized.
 *
 * @returns The `RNNetworkClient` singleton instance.
 *
 * @example
 * ```ts
 * const client = getNetworkClient();
 * const response = await client.get<User[]>('/api/users');
 * ```
 */
export function getNetworkClient(): RNNetworkClient {
  if (!networkClient) {
    networkClient = new RNNetworkClient();
  }
  return networkClient;
}

/**
 * Initialize the network client singleton with an optional custom timeout.
 *
 * @param timeout - Optional default request timeout in milliseconds.
 * @returns The initialized `RNNetworkClient` singleton.
 *
 * @example
 * ```ts
 * initializeNetworkClient(15000); // 15s timeout
 * ```
 */
export function initializeNetworkClient(timeout?: number): RNNetworkClient {
  networkClient = new RNNetworkClient(timeout);
  return networkClient;
}

/**
 * Reset the network client singleton to `null`.
 *
 * @example
 * ```ts
 * resetNetworkClient();
 * ```
 */
export function resetNetworkClient(): void {
  networkClient = null;
}
