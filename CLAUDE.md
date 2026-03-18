# Project Guidelines

## Package Manager

Use `bun` instead of `npm`/`npx` for all package management and script execution (e.g. `bun install`, `bun run`, `bunx`).

## Testing

All changes must include unit tests. Run unit tests with `bun run test`.

Do not automatically check or write integration tests. Integration tests are run manually by the user. If needed, always start the local validator (`bun run validator`) before running integration tests (`bun run test:integration`). The tests require a `solana-test-validator` running on port 8899.
