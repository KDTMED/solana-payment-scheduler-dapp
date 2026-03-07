# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install       # install dependencies
bun run dev       # start dev server at http://localhost:5173
bun run build     # tsc + vite build
bun run preview   # preview production build locally
bun run deploy    # build + deploy to GitHub Pages (gh-pages -d dist)
```

There are no tests in this project.

## Architecture

This is a React 18 + Vite + TypeScript frontend-only dapp. There is no backend. All on-chain interaction goes through `@coral-xyz/anchor` and `@solana/web3.js` directly from the browser.

**Network:** Solana Devnet. The RPC endpoint is set in `src/App.tsx` (`clusterApiUrl("devnet")`). Token mints (USDC/USDT devnet addresses) are in `src/constants.ts`.

**Program:** `5BhDb1YqZq8f9yED9rphTobT4zB25cwWWqLaZtYWCJd4` (devnet). The Anchor IDL is embedded in `src/idl.ts`.

### On-chain accounts

- `PaymentSchedule` PDA: seeds `["payment_schedule", authority]` — one per wallet, holds up to 50 scheduled payment entries
- `PaymentRecord` PDA: seeds `["payment_record", schedule, index (u8)]` — created by the keeper when a payment executes; probed for indices 0–99

PDA derivation lives in `src/utils/pda.ts`.

### Data flow

1. `useSchedule` (hook) — fetches and Borsh-decodes the `PaymentSchedule` account plus all `PaymentRecord` PDAs for the connected wallet. Re-runs on wallet change.
2. `useFundStatus` (hook) — polls the schedule's source token ATA and SOL balance every 15s to show sufficiency indicators.
3. `App.tsx` wires providers (`ConnectionProvider → WalletProvider → WalletModalProvider`) and renders `<Dashboard>`, which conditionally shows `<InitializeForm>` (no schedule) or the schedule dashboard (schedule exists).

### Key files

| File | Purpose |
|------|---------|
| `src/idl.ts` | Anchor IDL — source of truth for instruction/account shapes |
| `src/types.ts` | Shared TS interfaces (`PaymentSchedule`, `PaymentRecord`, `FundStatusResult`) |
| `src/constants.ts` | Program ID, token mints, `MAX_SCHEDULE_ENTRIES` (50), `MIN_GAS_LAMPORTS` |
| `src/utils/format.ts` | Token amount, SOL, timestamp, duration formatters |
| `src/components/InitializeForm.tsx` | Schedule creation — builds and sends `initialize_schedule` instruction |
| `src/components/FundStatus.tsx` | Token + SOL balance cards with top-up transaction flows |
| `src/components/ScheduleCard.tsx` | Summary card; includes `close_schedule` instruction |

### Switching networks

1. Change `clusterApiUrl("devnet")` → `clusterApiUrl("mainnet-beta")` in `src/App.tsx`
2. Update `USDC_MINT_DEVNET` / `USDT_MINT_DEVNET` in `src/constants.ts` with mainnet addresses
