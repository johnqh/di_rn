# Improvement Plans for @sudobility/di_rn

## Priority 1 - High Impact

### 1. Expand Test Coverage
- Currently only storage tests exist; add tests for all services
- Test RNNetworkService online/offline transitions
- Test RNThemeService dark/light/system mode changes
- Test RNNavigationService imperative navigation

### 2. Add JSDoc to All Exported Functions
- Many singleton management functions lack `@param`, `@returns`, `@throws` annotations
- Document the lazy native module loading pattern in each service
- Add `@example` blocks for common usage patterns

### 3. Improve Error Handling for Missing Native Modules
- Currently logs warnings when native modules aren't linked
- Consider providing stub implementations that throw descriptive errors
- Add a diagnostic function to check which native modules are available

## Priority 2 - Medium Impact

### 4. Add Dispose Consistency
- Not all services implement `dispose()` consistently
- RNStorage and AdvancedRNStorage lack cleanup methods
- Standardize the dispose pattern across all services

### 5. Add TypeScript Strict Typing for Native Module Returns
- `require()` calls return `any`; add proper type assertions
- Use generic type parameters for `getAsyncStorage()`, `getNetInfo()`, etc.
- Consider using `satisfies` for better type inference

### 6. Decouple from Specific Native Module Versions
- Some services depend on specific API shapes from native modules
- Add adapter layers to insulate from breaking changes in native module updates
- Document minimum supported versions for each native module

## Priority 3 - Nice to Have

### 7. Add Connection Quality Detection
- RNNetworkService only tracks online/offline
- Add connection type detection (WiFi, cellular, etc.)
- Add bandwidth estimation for adaptive content loading

### 8. Add Notification Channel Management
- RNNotificationService creates a default channel
- Allow consumers to configure custom channels
- Support channel groups for complex notification hierarchies

### 9. Add Performance Monitoring
- Track service initialization time for each native module
- Report lazy-load timing for debugging slow startup
- Integrate with Firebase Performance if available
