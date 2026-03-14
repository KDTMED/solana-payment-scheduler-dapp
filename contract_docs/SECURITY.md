# Security Model

This document describes the security properties of the Scheduled Transfer program and the rationale behind each design decision.

---

## Table of Contents

- [Threat Model](#threat-model)
- [Account Security](#account-security)
- [Instruction Security](#instruction-security)
- [Arithmetic Safety](#arithmetic-safety)
- [CPI Safety](#cpi-safety)
- [Known Design Tradeoffs](#known-design-tradeoffs)

---

## Threat Model

The program is designed to withstand the following adversaries:

- **Permissionless callers** — anyone can call `trigger_payment`. The design must ensure they cannot redirect funds, skip payments, replay payments, or extract more than the scheduled amount.
- **Malicious account substitution** — a caller may pass crafted accounts to instructions. Anchor's type system and explicit constraints must reject all invalid inputs.
- **Compromised cron operator** — the wallet calling `trigger_payment` may be under attacker control. This must not affect fund safety.
- **Clock manipulation** — validators can influence the on-chain clock within narrow bounds. The program must not be sensitive to small timestamp skew.

The authority private key is considered trusted. The program does not attempt to protect the authority from themselves.

---

## Account Security

### Signer enforcement

All instructions that mutate authority-controlled state require the `authority` account to be a `Signer<'info>`:

| Instruction          | Required signer  |
| -------------------- | ---------------- |
| `initialize`         | `authority`      |
| `close`              | `authority`      |
| `withdraw_tokens`    | `authority`      |
| `withdraw_sol`       | `authority`      |

`trigger_payment`, `check_funds`, `check_gas_funds`, `notify_funds_status`, and `notify_gas_status` do not require a privileged signer by design.

### Ownership and authority checks

Every instruction that operates on a `PaymentSchedule` account uses Anchor's `has_one = authority` constraint, which verifies that the `authority` account key matches the value stored in the `PaymentSchedule.authority` field. This prevents one authority from operating on another authority's schedule.

### Account type validation

All accounts are declared with strong Anchor types:

- `Account<'info, PaymentSchedule>` — Anchor validates the 8-byte discriminator, preventing type cosplay attacks where an attacker substitutes a differently-shaped account.
- `Account<'info, TokenAccount>` — enforces the SPL token account layout.
- `Program<'info, Token>` — ensures the token program account is exactly the SPL Token program; arbitrary program substitution is rejected.
- `Program<'info, System>` — same guarantee for the system program.

### PDA derivation and bump canonicalization

All PDAs use canonical bump seeds (the highest valid bump found during `find_program_address`). Anchor 0.32.1 derives and stores the bump at `init` time and validates it on every subsequent access, preventing bump-grinding attacks.

| PDA                | Seeds                                                    |
| ------------------ | -------------------------------------------------------- |
| `ScheduleCounter`  | `["schedule_counter", authority]`                        |
| `PaymentSchedule`  | `["payment_schedule", authority, schedule_id (u64 LE)]`  |

### Source token account ownership

The source SPL token account must be owned by the `PaymentSchedule` PDA (enforced via the `address` constraint, which derives the expected ATA from the PDA and token mint). The program signs CPI token transfers using the stored PDA bump. No external key can sign on behalf of the PDA, so the source account cannot be drained outside the defined schedule.

### Destination token account enforcement

`trigger_payment` derives the destination token account on-chain as the recipient's Associated Token Account for the configured token mint (using `ata_for`). The `address` constraint rejects any account that does not match. A permissionless caller cannot redirect funds to an arbitrary account.

### Re-initialization protection

`ScheduleCounter` and `PaymentSchedule` accounts are created with Anchor's `init` constraint, not `init_if_needed`. An account that already exists causes `init` to fail, making re-initialization impossible.

---

## Instruction Security

### `trigger_payment`

This is the most security-sensitive instruction because it is permissionless.

**Sequential payment enforcement** — the `payment_index` argument must equal `payment_schedule.executed_count`. This prevents:
- Skipping payments (caller cannot jump ahead in the schedule).
- Replaying payments (the count increments atomically before the CPI transfer).

**State update before CPI** — `executed_count` is incremented and the payment entry is removed from the schedule *before* the token transfer CPI is issued. This follows the checks-effects-interactions pattern and eliminates any reentrancy risk.

**Failure observability** — if the instruction fails (e.g. `InsufficientFunds`, `NoPaymentsDue`), a `PaymentFailed` event is emitted before returning the error. This allows off-chain subscribers to observe failures without a separate on-chain instruction.

### `withdraw_sol`

Rent-exempt minimum is calculated with `Rent::get()?.minimum_balance(pda_info.data_len())` and subtracted using `checked_sub`. The instruction fails if the requested withdrawal would drop the account below rent-exempt balance, preventing accidental account closure.

### `close`

Uses Anchor's `close = authority` constraint, which zeroes the account data, transfers remaining lamports to the authority, and prevents the account from being used after closure.

---

## Arithmetic Safety

All arithmetic operations use checked variants with explicit error returns. There are no unchecked additions, subtractions, or multiplications anywhere in the program.

| Operation                         | Method                                | Error on overflow/underflow |
| --------------------------------- | ------------------------------------- | --------------------------- |
| Increment `next_id`               | `checked_add(1)`                      | `ScheduleOverflow`          |
| Increment `executed_count`        | `checked_add(1)`                      | `ScheduleOverflow`          |
| Compute withdrawable SOL lamports | `checked_sub(min_rent)`               | `InsufficientFunds`         |

---

## CPI Safety

The program makes exactly two CPI calls, both to the SPL Token program:

1. `trigger_payment` — `token::transfer` from source ATA to recipient ATA, signed by the `PaymentSchedule` PDA.
2. `withdraw_tokens` — `token::transfer` from source ATA to a caller-supplied destination ATA, signed by the `PaymentSchedule` PDA and gated behind the `authority` signer check.

Both calls use `CpiContext::new_with_signer` with the PDA seeds reconstructed from on-chain state. No arbitrary program invocation is possible.

---

## Known Design Tradeoffs

### Permissionless execution exposes schedule contents

Because `trigger_payment` is permissionless, the `PaymentSchedule` account is publicly readable. Scheduled payment amounts, timestamps, and recipient addresses are visible on-chain. This is intentional — it enables trustless execution — but authorities should be aware that schedule details are not private.

### Schedule is immutable after creation

There is no `update` instruction. An authority who needs to change the recipient, token type, or payment amounts must close the existing schedule and create a new one. This is a deliberate constraint: immutability means a permissionless caller can trust the schedule they observe will not change between inspection and execution.

### Clock tolerance

The on-chain `Clock` sysvar's `unix_timestamp` can lag real-world time by a small amount (typically under a minute) due to validator slot timing. Payments scheduled to the second may execute slightly late. This is an inherent property of Solana's clock and not a program vulnerability.

### `withdraw_tokens` destination is unconstrained

The authority may withdraw tokens to any SPL token account. This is intentional — it provides flexibility for the authority to reclaim funds — and is safe because the authority is a required signer.
