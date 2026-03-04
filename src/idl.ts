export const IDL = {
  address: "5BhDb1YqZq8f9yED9rphTobT4zB25cwWWqLaZtYWCJd4",
  metadata: { name: "scheduled_transfer", version: "0.1.0", spec: "0.1.0" },
  instructions: [
    {
      name: "initialize",
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237],
      accounts: [
        { name: "payment_schedule", writable: true, pda: { seeds: [{ kind: "const", value: [112,97,121,109,101,110,116,95,115,99,104,101,100,117,108,101] }, { kind: "account", path: "authority" }] } },
        { name: "authority", writable: true, signer: true },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [
        { name: "schedule", type: { vec: { defined: { name: "ScheduledPayment" } } } },
        { name: "recipient", type: "pubkey" },
        { name: "destination_token_account", type: "pubkey" },
        { name: "token_type", type: { defined: { name: "TokenType" } } },
      ],
    },
    {
      name: "close",
      discriminator: [
        98,
        165,
        201,
        177,
        108,
        65,
        206,
        96
      ],
      accounts: [
        { name: "payment_schedule", writable: true, pda: { seeds: [{ kind: "const", value: [112,97,121,109,101,110,116,95,115,99,104,101,100,117,108,101] }, { kind: "account", path: "authority" }] } },
        { name: "authority", writable: true, signer: true },
      ],
      args: [],
    },
    {
      name: "check_funds",
      discriminator: [
        120,
        243,
        158,
        41,
        82,
        144,
        227,
        183
      ],
      accounts: [
        { name: "payment_schedule" },
        { name: "source_token_account" },
      ],
      args: [],
    },
    {
      name: "trigger_payment",
      discriminator: [0, 0, 0, 0, 0, 0, 0, 0],
      accounts: [
        { name: "payment_schedule", writable: true },
        { name: "source_token_account", writable: true },
        { name: "destination_token_account", writable: true },
        { name: "payment_record", writable: true },
        { name: "caller", writable: true, signer: true },
        { name: "token_program", address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [{ name: "payment_index", type: "u8" }],
    },
  ],
  accounts: [
    {
      name: "PaymentSchedule",
      discriminator: [
        220,
        252,
        154,
        129,
        139,
        124,
        204,
        75
      ]
    },
    {
      name: "PaymentRecord",
      discriminator: [
        202,
        168,
        56,
        249,
        127,
        226,
        86,
        226
      ]
    },
  ],
  types: [
    {
      name: "ScheduledPayment",
      type: {
        kind: "struct",
        fields: [
          { name: "timestamp", type: "i64" },
          { name: "amount", type: "u64" },
        ],
      },
    },
    {
      name: "TokenType",
      type: { kind: "enum", variants: [{ name: "USDC" }, { name: "USDT" }] },
    },
    {
      name: "FailureReason",
      type: {
        kind: "enum",
        variants: [
          { name: "InsufficientFunds" },
          { name: "InsufficientGasFunds" },
          { name: "NoPaymentsDue" },
          { name: "Unknown" },
        ],
      },
    },
    {
      name: "PaymentSchedule",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "pubkey" },
          { name: "recipient", type: "pubkey" },
          { name: "destination_token_account", type: "pubkey" },
          { name: "token_type", type: { defined: { name: "TokenType" } } },
          { name: "schedule", type: { vec: { defined: { name: "ScheduledPayment" } } } },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "PaymentRecord",
      type: {
        kind: "struct",
        fields: [
          { name: "timestamp", type: "i64" },
          { name: "amount", type: "u64" },
          { name: "recipient", type: "pubkey" },
          { name: "executed_at", type: "i64" },
          { name: "payment_index", type: "u8" },
          { name: "bump", type: "u8" },
        ],
      },
    },
  ],
  errors: [
    { code: 6000, name: "InsufficientFunds", msg: "Insufficient funds for the next payment" },
    { code: 6001, name: "InsufficientGasFunds", msg: "Insufficient funds to cover gas fees" },
    { code: 6002, name: "NoPaymentsScheduled", msg: "No payments scheduled" },
    { code: 6003, name: "NoPaymentsDue", msg: "No payments due at this time" },
  ],
} as const;
