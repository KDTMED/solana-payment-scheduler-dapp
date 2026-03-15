# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly. **Do not open a public GitHub issue.**

Instead, email the maintainers directly or use [GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) feature on this repository.

We aim to acknowledge reports within 48 hours and provide a fix or mitigation plan within 7 days for critical issues.

## Security Model

This is a **frontend-only** dApp that interacts with a Solana on-chain program. It does not have a backend server. All transactions are signed client-side by the user's wallet.

### Trust Boundaries

| Boundary | Trust Level |
|---|---|
| On-chain program | Enforces all payment logic, access control, and fund custody |
| Frontend (this repo) | Untrusted — provides UX convenience checks only |
| Wallet adapter | Delegates signing to user-approved browser extensions |
| RPC endpoint | Trusted for reads; transactions are verified on-chain |

**Important:** Frontend validation (e.g. recipient checks, amount limits) is for UX only. The on-chain program is the sole authority for enforcing constraints.

### Key Security Measures

#### Input Validation
- Schedule IDs are validated as valid unsigned 64-bit integers before PDA derivation
- Token amounts are parsed using `BigInt` to avoid floating-point precision loss
- Recipient addresses are validated as proper Solana public keys

#### Error Handling
- Blockchain error messages are **not** exposed to users — generic messages are shown in the UI
- Detailed errors are logged to the browser console for debugging

#### Content Security Policy
- A CSP meta tag is set in `index.html` restricting script sources, style sources, and network connections to known Solana RPC endpoints

#### RPC Configuration
- Custom RPC URLs on mainnet are required to use HTTPS
- The `localnet` cluster is blocked in production builds

#### No Secrets in Source
- No private keys, API keys, or secrets are stored in the codebase
- Environment variables prefixed with `VITE_` are build-time only and contain no secrets

## Dependencies

This project depends on well-known Solana ecosystem packages (`@solana/web3.js`, `@coral-xyz/anchor`, `@solana/wallet-adapter-*`). Run `bun audit` periodically to check for known vulnerabilities.

## Scope

The following are **out of scope** for this repository's security:

- The on-chain Solana program itself (separate codebase)
- Third-party wallet extensions (Phantom, Solflare, etc.)
- Solana network availability or RPC provider security
