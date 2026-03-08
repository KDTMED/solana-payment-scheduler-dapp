# Scheduled Transfer UI

A React frontend for managing on-chain scheduled token payments on Solana.
Built with Vite, TypeScript, Tailwind CSS, and Anchor.

## Overview

This app lets users create and monitor a **payment schedule** — a Solana
program account that holds a list of future USDC/USDT transfers to a
recipient. A separate keeper/crank calls `trigger_payment` on-chain when
payments come due; this UI handles setup, funding, and monitoring.

**Program ID (Devnet):** `5BhDb1YqZq8f9yED9rphTobT4zB25cwWWqLaZtYWCJd4`

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
bun test                  # run once
bun run test:watch        # watch mode
bun run test:coverage     # with coverage report
```

---

## Usage

1. **Connect wallet** using the button in the top-right corner.
2. If you have no existing schedule, the **Initialize Schedule** form appears
   with the **Fund Status** panel below it. You can top up or withdraw funds
   at any time, even before creating a schedule.
   - Enter a recipient address and their destination token account (ATA).
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
    StatusBadge.tsx      # OK / Low indicator pill
  hooks/
    useFundStatus.ts     # Polls token + SOL balances every 15s
    useSchedule.ts       # Fetches and decodes schedule + record PDAs
  utils/
    format.ts            # Token amount, SOL, timestamp, duration helpers
    pda.ts               # PDA derivation for schedule and record accounts
  constants.ts           # Program ID, token mints, decimals, limits
  scheduled_transfer.ts  # Anchor IDL type definitions for the on-chain program
  types.ts               # Shared TypeScript interfaces
```

---

## On-Chain Accounts

| Account          | Seeds                                        |
|------------------|----------------------------------------------|
| `PaymentSchedule`| `["payment_schedule", authority]`            |
| `PaymentRecord`  | `["payment_record", schedule, index (u8)]`   |

Up to **50** payment entries per schedule. Payment records are probed for
indices 0–99.

---

## Network

The app runs on **Devnet** by default. To switch networks, update the
`endpoint` in `src/App.tsx`:

```ts
const endpoint = useMemo(() => clusterApiUrl("mainnet-beta"), []);
```

And update the mint addresses in `src/constants.ts` accordingly.

---

## License

MIT
