# Project Guidelines

## Package Manager

Use `bun` instead of `npm`/`npx` for all package management and script execution (e.g. `bun install`, `bun run`, `bunx`).

## Integration Tests

Always start the local validator (`bun run validator`) before running integration tests (`bun run test:integration`). The tests require a `solana-test-validator` running on port 8899.
