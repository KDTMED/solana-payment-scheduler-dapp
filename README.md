# Scheduled Transfer

A Solana program built with [Anchor](https://www.anchor-lang.com/) that enables
permissionless, time-based SPL token transfers. A payment authority creates a
schedule of future transfers, and any caller (e.g. a TukTuk cron worker) can
trigger each payment once its timestamp is reached.

---

## Table of Contents

- [Overview](#overview)
- [Program ID](#program-id)
- [Architecture](#architecture)
  - [Accounts](#accounts)
  - [Instructions](#instructions)
  - [Events](#events)
  - [Errors](#errors)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Build](#build)
  - [Test](#test)
- [Usage](#usage)
  - [Initialize a Schedule](#initialize-a-schedule)
  - [Trigger a Payment](#trigger-a-payment)
  - [Check Funds](#check-funds)
  - [Notify Status](#notify-status)
  - [Report a Failure](#report-a-failure)
- [PDAs](#pdas)
- [Security Model](#security-model)

---

## Overview

The program lets a token holder pre-authorise a sequence of future transfers to
a fixed recipient. Once deployed, **no privileged key is required to execute
payments** — any wallet can call `trigger_payment` when a payment comes due,
making it suitable for automation via on-chain cron services such as
[TukTuk](https://tuktuk.so/).

Key design decisions:

- Payments are stored sorted by timestamp so the "next due" entry is always at
  a predictable position.
- The source token account is owned by the `PaymentSchedule` PDA, so the
  program controls transfers without needing the authority to be online.
- Each executed payment mints an immutable `PaymentRecord` PDA for auditing.
- Failure reporting is a separate, always-succeeding instruction so that failed
  payment attempts are still visible on-chain.

---

## Program ID

```text
9AYYXREwPQu7pRhnfsYr1pRy194zdJ4fTb55FhRCMvLb
```

---

## Architecture

### Accounts

#### `PaymentSchedule`

The core PDA that stores the transfer configuration and the ordered list of
pending payments.

| Field                      | Type                    | Description                              |
| -------------------------- | ----------------------- | ---------------------------------------- |
| `authority`                | `Pubkey`                | Wallet that created the schedule         |
| `recipient`                | `Pubkey`                | Recipient wallet address                 |
| `destination_token_account`| `Pubkey`                | Recipient's SPL token account            |
| `token_type`               | `TokenType`             | `USDC` or `USDT`                         |
| `schedule`                 | `Vec<ScheduledPayment>` | Up to 50 payments, sorted by timestamp   |
| `bump`                     | `u8`                    | PDA bump seed                            |

**Seeds:** `["payment_schedule", authority]`

#### `PaymentRecord`

An immutable audit log entry created for each successfully executed payment.

| Field           | Type     | Description                          |
| --------------- | -------- | ------------------------------------ |
| `timestamp`     | `i64`    | Originally scheduled UNIX timestamp  |
| `amount`        | `u64`    | Token amount transferred             |
| `recipient`     | `Pubkey` | Recipient at time of execution       |
| `executed_at`   | `i64`    | Actual execution UNIX timestamp      |
| `payment_index` | `u8`     | Index used when creating this record |
| `bump`          | `u8`     | PDA bump seed                        |

**Seeds:** `["payment_record", payment_schedule, payment_index]`

---

### Instructions

#### `initialize`

Creates a `PaymentSchedule` PDA. The provided schedule is sorted ascending by
timestamp before being stored.

| Argument                   | Type                    |
| -------------------------- | ----------------------- |
| `schedule`                 | `Vec<ScheduledPayment>` |
| `recipient`                | `Pubkey`                |
| `destination_token_account`| `Pubkey`                |
| `token_type`               | `TokenType`             |

**Signer:** `authority`

---

#### `trigger_payment`

Executes the earliest due payment. Transfers tokens from the PDA-owned source
account to the destination account, creates a `PaymentRecord`, removes the
entry from the schedule, and emits `PaymentExecuted`.

Fails with:
- `InsufficientFunds` — source balance is below the payment amount.
- `NoPaymentsDue` — no entry has a timestamp ≤ the current clock.

**Permissionless** — any wallet can be the `caller`.

---

#### `check_funds`

Returns an error if the source token account cannot cover the next scheduled
payment. Intended for pre-flight checks by the cron before submitting
`trigger_payment`.

---

#### `check_gas_funds`

Returns an error if the authority's SOL balance is below twice the minimum
rent-exempt threshold.

---

#### `notify_funds_status`

Like `check_funds`, but **always returns `Ok`**. Emits a `FundsWarning` event
when funds are insufficient, so a log subscriber (e.g. Slack bot) can alert the
authority without the cron's heartbeat transaction failing.

---

#### `notify_gas_status`

Like `check_gas_funds`, but **always returns `Ok`**. Emits a `GasFundsWarning`
event when SOL is low.

---

#### `report_payment_failure`

Records a `PaymentFailed` event on-chain. Because a failed `trigger_payment`
transaction reverts all state (including logs), the cron must catch the error
off-chain and call this instruction separately.

**Permissionless** — any wallet can be the `caller`.

---

### Events

| Event              | Emitted by               | Description                               |
| ------------------ | ------------------------ | ----------------------------------------- |
| `PaymentExecuted`  | `trigger_payment`        | A transfer completed successfully         |
| `PaymentFailed`    | `report_payment_failure` | A transfer attempt failed                 |
| `FundsWarning`     | `notify_funds_status`    | Source balance is below next payment      |
| `GasFundsWarning`  | `notify_gas_status`      | Authority SOL is below safe threshold     |

---

### Errors

| Code   | Name                   | Description                                    |
| ------ | ---------------------- | ---------------------------------------------- |
| `6000` | `InsufficientFunds`    | Source token balance < next payment amount     |
| `6001` | `InsufficientGasFunds` | Authority SOL < 2× minimum rent               |
| `6002` | `NoPaymentsScheduled`  | Schedule is empty                              |
| `6003` | `NoPaymentsDue`        | No payment timestamp ≤ current clock           |

---

## Getting Started

### Prerequisites

| Tool            | Version   |
| --------------- | --------- |
| Rust            | `1.92.0`  |
| Anchor CLI      | `0.32.1`  |
| Solana CLI      | `≥ 2.3.1` |
| Node / Yarn     | any LTS   |

Install the Rust toolchain (managed automatically via `rust-toolchain.toml`):

```bash
rustup show
```

Install Anchor CLI:

```bash
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --tag v0.32.1
```

### Build

```bash
anchor build
```

The compiled `.so` is written to `target/deploy/scheduled_transfer.so`.

### Test

Tests use [Mollusk SVM](https://github.com/buffalojoec/mollusk) and run without
a local validator:

```bash
cargo test-sbf
```

Or via the Anchor alias:

```bash
anchor test
```

---

## Usage

### Initialize a Schedule

```typescript
await program.methods
  .initialize(
    [
      { timestamp: new BN(Date.now() / 1000 + 3600), amount: new BN(100_000) },
      { timestamp: new BN(Date.now() / 1000 + 7200), amount: new BN(200_000) },
    ],
    recipient,
    destinationTokenAccount,
    { usdc: {} }
  )
  .accounts({ authority: wallet.publicKey })
  .rpc();
```

### Trigger a Payment

```typescript
await program.methods
  .triggerPayment(0) // payment_index
  .accounts({
    paymentSchedule: schedPda,
    sourceTokenAccount: sourceTa,
    destinationTokenAccount: destTa,
    paymentRecord: recordPda,
    caller: wallet.publicKey,
  })
  .rpc();
```

### Check Funds

```typescript
await program.methods
  .checkFunds()
  .accounts({ paymentSchedule: schedPda, sourceTokenAccount: sourceTa })
  .rpc();
```

### Notify Status

These are fire-and-forget heartbeat calls safe to include in every cron tick:

```typescript
await program.methods
  .notifyFundsStatus()
  .accounts({ paymentSchedule: schedPda, sourceTokenAccount: sourceTa })
  .rpc();

await program.methods
  .notifyGasStatus()
  .accounts({ authority: authorityPubkey })
  .rpc();
```

### Report a Failure

```typescript
await program.methods
  .reportPaymentFailure(0, { insufficientFunds: {} })
  .accounts({ paymentSchedule: schedPda, caller: wallet.publicKey })
  .rpc();
```

---

## PDAs

```text
PaymentSchedule:
  seeds = ["payment_schedule", authority]

PaymentRecord:
  seeds = ["payment_record", payment_schedule, payment_index (u8)]
```

---

## Security Model

- **Source token account ownership** — The source SPL token account must be
  owned by the `PaymentSchedule` PDA. The program signs CPI transfers using the
  PDA seeds, so no external key can drain it outside of the defined schedule.
- **Destination enforcement** — `trigger_payment` validates that the
  `destination_token_account` matches the address stored in the schedule,
  preventing redirection attacks.
- **Schedule immutability** — There is no `update` instruction; the schedule
  cannot be altered after creation. Re-deploying requires creating a new PDA
  with a different authority key.
- **Permissionless execution** — Anyone can call `trigger_payment`, enabling
  decentralised automation without exposing the authority private key to a cron
  server.
