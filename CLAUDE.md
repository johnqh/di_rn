# CLAUDE.md

## Project Overview

**@sudobility/di_rn** - React Native implementations of dependency injection services for Sudobility.

- **Type**: React Native DI service library
- **License**: BUSL-1.1

## Package Manager

**This project uses Bun as the package manager.** Always use `bun` commands instead of `npm`:

```bash
# Install dependencies
bun install

# Run any script
bun run <script-name>
```

## Development Commands

```bash
bun run build        # Build TypeScript to dist/
bun run dev          # Watch mode build
bun run lint         # Run ESLint
bun run lint:fix     # Auto-fix ESLint issues
bun run format       # Format with Prettier
bun run format:check # Check formatting
bun run typecheck    # TypeScript check (no emit)
bun run test         # Run tests
```

## Architecture

- **Language**: TypeScript
- **Build**: TypeScript compiler via `bunx tsc`
- **Output**: ESM (`dist/`)
- **Strict mode**: All strict TypeScript checks enabled

### Peer Dependencies

- `@sudobility/di` - Core DI definitions
- `@sudobility/types` - Shared type definitions
- `react` and `react-native`
- `react-native-toast-message`
