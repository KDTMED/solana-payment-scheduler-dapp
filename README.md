# Scheduled Transfer UI

A React frontend for managing on-chain scheduled token payments on Solana.
Built with Vite, TypeScript, Tailwind CSS, and Anchor.

## Overview

This app lets users create and monitor a **payment schedule** — a Solana
program account that holds a list of future USDC/USDT transfers to a
recipient. A separate keeper/crank calls `trigger_payment` on-chain when
payments come due; this UI handles setup, funding, and monitoring.

**Program ID (Devnet):** `BcrXS7PaXohfXWXLyiTmxEe3ujnWzkQY1cC9Q85aHaKD`

---

## Features

- **Initialize a schedule** — define payment entries (date + amount) and a
  recipient token account
- **Fund status dashboard** — live USDC, USDT, and SOL balances with
  sufficiency indicators; always visible whether or not a schedule exists
- **Top-up flows** — send USDC, USDT, or SOL to the schedule PDA directly
  from the UI
- **Withdraw flows** — recover USDC, USDT, or SOL from the schedule PDA at
  any time, with or without pending payments
- **Payments table** — view pending scheduled payments and completed
  payment history
- **Wallet support** — Phantom and Solflare via wallet-adapter

---

## Tech Stack

| Layer       | Library                                   |
|-------------|-------------------------------------------|
| Framework   | React 18 + Vite                           |
| Language    | TypeScript                                |
| Styling     | Tailwind CSS                              |
| Solana      | `@solana/web3.js`, `@solana/spl-token`    |
| Wallet      | `@solana/wallet-adapter-react`            |
| Program SDK | `@coral-xyz/anchor`                       |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- A Solana wallet browser extension (Phantom or Solflare)
- Devnet SOL for fees (`solana airdrop 1` or the [faucet](https://faucet.solana.com))

Update the program ID in the following locations:
 - integration/helpers.ts L22:  "BcrXS7PaXohfXWXLyiTmxEe3ujnWzkQY1cC9Q85aHaKD",
 - integration/setup-validator.ts L13:const PROGRAM_ID = "BcrXS7PaXohfXWXLyiTmxEe3ujnWzkQY1cC9Q85aHaKD";
 - src/constants.ts L5:  "BcrXS7PaXohfXWXLyiTmxEe3ujnWzkQY1cC9Q85aHaKD",

Copy the IDL and types from the smart contract build output to the dapp:
```bash
cp solana-payment-scheduler-smartcontract/target/types/scheduled_transfer.ts solana-payment-scheduler-dapp/src/idl/
cp solana-payment-scheduler-smartcontract/target/idl/scheduled_transfer.json solana-payment-scheduler-dapp/src/idl/
```

### Install & Run

```bash
bun install
bun dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
bun run build
```

### Test

```bash
bun run test              # unit tests (run once)
bun run test:watch        # unit tests (watch mode)
bun run test:coverage     # unit tests with coverage report
```

### Integration Tests

Integration tests run against a local Solana validator with the program
deployed from the local build. They test the full on-chain lifecycle: admin
setup, authority registration, schedule creation, payment triggering, token
withdrawal, and schedule closing.

**Prerequisites:**
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) ≥ 2.3.1
- Built program at `../solana-payment-scheduler-smartcontract/target/deploy/scheduled_transfer.so`

```bash
# Terminal 1 — start a local validator with the program and token mints
bun run validator

# Terminal 2 — run integration tests
bun run test:integration
```

The `validator` script generates USDC/USDT mint fixtures and an upgrade
authority keypair in `integration/fixtures/` (gitignored) and starts
`solana-test-validator` with the program deployed locally and the test mints
pre-loaded.

---

## Usage

Install John 'solana-private-key' to get the private key that can be imported into phantom:
```bash
cargo install solana-private-key
```

Then run the following command to get the bs58 representation of the private key (in ~/.config/solana/id.json):
```bash
solana-private-key
```

1. **Connect wallet** using the button in the top-right corner.
2. **Admin setup** (one-time, via `/admin` page):
   - The program upgrade authority sets the admin list via **Set Admins**.
   - An admin registers payment authorities via **Register Authority**.
3. Once registered, use the **Initialize Schedule** form:
   - Enter a recipient address.
   - Select USDC or USDT.
   - Add one or more payment entries with a date/time and amount.
   - Click **Create Schedule**.
3. Once initialized, the dashboard shows:
   - **Schedule Card** — summary of pending payments and total remaining.
   - **Fund Status** — separate USDC, USDT, and SOL panels each with
     **Top Up** and **Withdraw** buttons.
   - **Scheduled Payments** — upcoming payments with due/overdue indicators.
   - **Payment History** — completed payments recorded on-chain.
4. Use **Top Up** to fund the schedule before payments come due, or
   **Withdraw** to recover funds at any time — pending payments do not
   block withdrawals.

---

## Project Structure

```text
src/
  components/
    FundStatus.tsx       # USDC, USDT, and SOL balance cards with top-up and withdraw flows
    Header.tsx           # Sticky nav with wallet button
    InitializeForm.tsx   # Schedule creation form
    PaymentsTable.tsx    # Upcoming and historical payments
    ScheduleCard.tsx     # Schedule summary header card
    ScheduleList.tsx     # List of user's schedules
    StatusBadge.tsx      # OK / Low indicator pill
  hooks/
    useFundStatus.ts     # Polls token + SOL balances every 15s
    useSchedule.ts       # Fetches and decodes schedule PDAs
  pages/
    Admin.tsx            # Admin panel for set_admins and initialize_authority
    ScheduleDetail.tsx   # Single schedule detail view
  utils/
    format.ts            # Token amount, SOL, timestamp, duration helpers
    pda.ts               # PDA derivation for schedule and counter accounts
  idl/
    scheduled_transfer.json  # Anchor IDL
    scheduled_transfer.ts    # Typed IDL for TypeScript
  constants.ts           # Program ID, token mints, decimals, limits
  config.ts              # Cluster and endpoint configuration
  types.ts               # Shared TypeScript interfaces
integration/
  setup-validator.ts     # Generates mint fixtures and starts solana-test-validator
  helpers.ts             # Test utilities (airdrop, ATA creation, PDA derivation)
  scheduled-transfer.test.ts  # On-chain integration tests
  vitest.config.ts       # Vitest config for integration tests
```

---

## On-Chain Accounts

| Account           | Seeds                                                       |
|-------------------|-------------------------------------------------------------|
| `ProgramConfig`   | `["program_config"]`                                        |
| `AuthorityRegistry` | `["authority_registry"]`                                  |
| `ScheduleCounter` | `["schedule_counter", authority]`                           |
| `PaymentSchedule` | `["payment_schedule", authority, schedule_id (u64 LE)]`     |

The program uses a two-tier access control model:
- The program's **upgrade authority** manages an admin list via `set_admins`,
  stored in the `ProgramConfig` PDA.
- Only **admins** can call `initialize_authority` to register new payment
  authorities in the `AuthorityRegistry`.
- Registered authorities can then create payment schedules.

A `ScheduleCounter` PDA tracks the next available `schedule_id` per authority,
allowing multiple independent schedules. Each schedule is dynamically sized to
fit exactly the number of payments provided (no fixed upper limit).

---

## Network

The app runs on **Devnet** by default. Switch clusters via environment variable:

```bash
VITE_SOLANA_CLUSTER=localnet bun dev       # local validator
VITE_SOLANA_CLUSTER=devnet bun dev         # devnet (default)
VITE_SOLANA_CLUSTER=mainnet-beta bun dev   # mainnet
```

Token mint addresses are configured per cluster in `src/constants.ts`.
A custom RPC URL can be set via `VITE_SOLANA_RPC_URL`.

---

## Security

See [SECURITY.md](SECURITY.md) for the security policy, threat model, and instructions for reporting vulnerabilities.

---

## License

MIT
