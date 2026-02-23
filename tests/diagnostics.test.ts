import { describe, it, expect } from 'vitest';
import { checkNativeModules } from '../src/diagnostics.js';

describe('checkNativeModules', () => {
  it('should return diagnostics for all native modules', () => {
    const diagnostics = checkNativeModules();

    expect(diagnostics.modules).toBeInstanceOf(Array);
    expect(diagnostics.modules.length).toBeGreaterThan(0);
    expect(diagnostics.availableCount + diagnostics.unavailableCount).toBe(
      diagnostics.modules.length
    );
    expect(typeof diagnostics.summary).toBe('string');
  });

  it('should include module names in diagnostics', () => {
    const diagnostics = checkNativeModules();
    const names = diagnostics.modules.map((m) => m.name);

    expect(names).toContain('@react-native-async-storage/async-storage');
    expect(names).toContain('@react-native-community/netinfo');
    expect(names).toContain('@notifee/react-native');
    expect(names).toContain('react-native');
    expect(names).toContain('react-native-config');
  });

  it('should generate a summary string', () => {
    const diagnostics = checkNativeModules();
    expect(diagnostics.summary).toContain('Native modules:');
    expect(diagnostics.summary).toContain('available');
  });

  it('should include error messages for unavailable modules', () => {
    const diagnostics = checkNativeModules();
    for (const mod of diagnostics.modules) {
      if (!mod.available) {
        expect(mod.error).toBeDefined();
        expect(typeof mod.error).toBe('string');
      }
    }
  });

  it('should mark each module as either available or unavailable', () => {
    const diagnostics = checkNativeModules();
    for (const mod of diagnostics.modules) {
      expect(typeof mod.available).toBe('boolean');
      expect(typeof mod.name).toBe('string');
    }
  });

  it('should have correct count totals', () => {
    const diagnostics = checkNativeModules();
    const manualAvailable = diagnostics.modules.filter(
      (m) => m.available
    ).length;
    const manualUnavailable = diagnostics.modules.filter(
      (m) => !m.available
    ).length;
    expect(diagnostics.availableCount).toBe(manualAvailable);
    expect(diagnostics.unavailableCount).toBe(manualUnavailable);
  });
});
