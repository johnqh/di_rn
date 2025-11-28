import { RNNetworkService, RNNetworkClient } from './network.rn.js';

// Singleton management for network service
let networkService: RNNetworkService | null = null;
let networkClient: RNNetworkClient | null = null;

export function getNetworkService(): RNNetworkService {
  if (!networkService) {
    networkService = new RNNetworkService();
  }
  return networkService;
}

export function initializeNetworkService(
  service?: RNNetworkService
): RNNetworkService {
  if (networkService) {
    networkService.dispose();
  }
  networkService = service ?? new RNNetworkService();
  return networkService;
}

export function resetNetworkService(): void {
  if (networkService) {
    networkService.dispose();
    networkService = null;
  }
}

export function getNetworkClient(): RNNetworkClient {
  if (!networkClient) {
    networkClient = new RNNetworkClient();
  }
  return networkClient;
}

export function initializeNetworkClient(timeout?: number): RNNetworkClient {
  networkClient = new RNNetworkClient(timeout);
  return networkClient;
}

export function resetNetworkClient(): void {
  networkClient = null;
}
