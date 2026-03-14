/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/scheduled_transfer.json`.
 */
export type ScheduledTransfer = {
  "address": "5BhDb1YqZq8f9yED9rphTobT4zB25cwWWqLaZtYWCJd4",
  "metadata": {
    "name": "scheduledTransfer",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "checkFunds",
      "discriminator": [
        120,
        243,
        158,
        41,
        82,
        144,
        227,
        183
      ],
      "accounts": [
        {
          "name": "paymentSchedule"
        },
        {
          "name": "sourceTokenAccount"
        }
      ],
      "args": []
    },
    {
      "name": "checkGasFunds",
      "discriminator": [
        238,
        187,
        92,
        97,
        165,
        194,
        140,
        43
      ],
      "accounts": [
        {
          "name": "authority"
        }
      ],
      "args": []
    },
    {
      "name": "close",
      "discriminator": [
        98,
        165,
        201,
        177,
        108,
        65,
        206,
        96
      ],
      "accounts": [
        {
          "name": "paymentSchedule",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  115,
                  99,
                  104,
                  101,
                  100,
                  117,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "payment_schedule.schedule_id",
                "account": "paymentSchedule"
              }
            ]
          }
        },
        {
          "name": "sourceTokenAccount",
          "writable": true
        },
        {
          "name": "destinationTokenAccount",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "paymentSchedule"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "scheduleCounter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  99,
                  104,
                  101,
                  100,
                  117,
                  108,
                  101,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "paymentSchedule",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  115,
                  99,
                  104,
                  101,
                  100,
                  117,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "schedule_counter.next_id",
                "account": "scheduleCounter"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "scheduleCounter"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "schedule",
          "type": {
            "vec": {
              "defined": {
                "name": "scheduledPayment"
              }
            }
          }
        },
        {
          "name": "recipient",
          "type": "pubkey"
        },
        {
          "name": "tokenType",
          "type": {
            "defined": {
              "name": "tokenType"
            }
          }
        }
      ]
    },
    {
      "name": "initializeCounter",
      "docs": [
        "Initialize the per-authority counter. Must be called once before",
        "creating any schedules for a given authority."
      ],
      "discriminator": [
        67,
        89,
        100,
        87,
        231,
        172,
        35,
        124
      ],
      "accounts": [
        {
          "name": "scheduleCounter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  99,
                  104,
                  101,
                  100,
                  117,
                  108,
                  101,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "notifyFundsStatus",
      "discriminator": [
        199,
        16,
        231,
        180,
        32,
        200,
        205,
        64
      ],
      "accounts": [
        {
          "name": "paymentSchedule"
        },
        {
          "name": "sourceTokenAccount"
        }
      ],
      "args": []
    },
    {
      "name": "notifyGasStatus",
      "discriminator": [
        48,
        41,
        222,
        70,
        241,
        168,
        194,
        200
      ],
      "accounts": [
        {
          "name": "authority"
        }
      ],
      "args": []
    },
    {
      "name": "triggerPayment",
      "docs": [
        "Trigger execution of a due payment.",
        "",
        "This instruction is intentionally permissionless — any caller may",
        "execute a payment on behalf of a schedule as long as it is due.",
        "Funds are always transferred to the recipient's ATA derived from",
        "the recipient and token type stored on-chain, so a permissionless",
        "caller cannot redirect them.",
        "",
        "Emits `PaymentFailed` before returning an error if the payment cannot",
        "be executed due to no payment being due or insufficient funds."
      ],
      "discriminator": [
        47,
        8,
        106,
        219,
        103,
        158,
        8,
        148
      ],
      "accounts": [
        {
          "name": "paymentSchedule",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  115,
                  99,
                  104,
                  101,
                  100,
                  117,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "payment_schedule.authority",
                "account": "paymentSchedule"
              },
              {
                "kind": "account",
                "path": "payment_schedule.schedule_id",
                "account": "paymentSchedule"
              }
            ]
          }
        },
        {
          "name": "sourceTokenAccount",
          "writable": true
        },
        {
          "name": "destinationTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "paymentIndex",
          "type": "u8"
        }
      ]
    },
    {
      "name": "withdrawTokens",
      "discriminator": [
        2,
        4,
        225,
        61,
        19,
        182,
        106,
        170
      ],
      "accounts": [
        {
          "name": "paymentSchedule",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  115,
                  99,
                  104,
                  101,
                  100,
                  117,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "payment_schedule.schedule_id",
                "account": "paymentSchedule"
              }
            ]
          }
        },
        {
          "name": "sourceTokenAccount",
          "writable": true
        },
        {
          "name": "destinationTokenAccount",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "paymentSchedule"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "paymentSchedule",
      "discriminator": [
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
      "name": "scheduleCounter",
      "discriminator": [
        1,
        138,
        178,
        136,
        96,
        4,
        89,
        61
      ]
    }
  ],
  "events": [
    {
      "name": "fundsWarning",
      "discriminator": [
        88,
        88,
        169,
        47,
        80,
        221,
        213,
        28
      ]
    },
    {
      "name": "gasFundsWarning",
      "discriminator": [
        99,
        46,
        113,
        34,
        12,
        231,
        169,
        123
      ]
    },
    {
      "name": "paymentExecuted",
      "discriminator": [
        153,
        165,
        141,
        18,
        246,
        20,
        204,
        227
      ]
    },
    {
      "name": "paymentFailed",
      "discriminator": [
        169,
        93,
        117,
        164,
        245,
        205,
        208,
        112
      ]
    },
    {
      "name": "tokensWithdrawn",
      "discriminator": [
        30,
        116,
        110,
        147,
        87,
        89,
        9,
        158
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "insufficientFunds"
    },
    {
      "code": 6001,
      "name": "insufficientGasFunds"
    },
    {
      "code": 6002,
      "name": "noPaymentsScheduled"
    },
    {
      "code": 6003,
      "name": "noPaymentsDue"
    },
    {
      "code": 6004,
      "name": "scheduleTooLarge"
    },
    {
      "code": 6005,
      "name": "invalidPaymentAmount"
    },
    {
      "code": 6006,
      "name": "invalidPaymentIndex"
    },
    {
      "code": 6007,
      "name": "scheduleOverflow"
    }
  ],
  "types": [
    {
      "name": "failureReason",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "insufficientFunds"
          },
          {
            "name": "insufficientGasFunds"
          },
          {
            "name": "noPaymentsDue"
          },
          {
            "name": "unknown"
          }
        ]
      }
    },
    {
      "name": "fundsWarning",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "schedule",
            "type": "pubkey"
          },
          {
            "name": "required",
            "type": "u64"
          },
          {
            "name": "available",
            "type": "u64"
          },
          {
            "name": "nextPaymentTimestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "gasFundsWarning",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "availableLamports",
            "type": "u64"
          },
          {
            "name": "minimumLamports",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "paymentExecuted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "schedule",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "scheduledTimestamp",
            "type": "i64"
          },
          {
            "name": "executedAt",
            "type": "i64"
          },
          {
            "name": "paymentIndex",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "paymentFailed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "schedule",
            "type": "pubkey"
          },
          {
            "name": "paymentIndex",
            "type": "u8"
          },
          {
            "name": "reason",
            "type": {
              "defined": {
                "name": "failureReason"
              }
            }
          },
          {
            "name": "failedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "paymentSchedule",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "scheduleId",
            "type": "u64"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "tokenType",
            "type": {
              "defined": {
                "name": "tokenType"
              }
            }
          },
          {
            "name": "schedule",
            "type": {
              "vec": {
                "defined": {
                  "name": "scheduledPayment"
                }
              }
            }
          },
          {
            "name": "executedCount",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "scheduleCounter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "nextId",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "scheduledPayment",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "tokenType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "usdc"
          },
          {
            "name": "usdt"
          }
        ]
      }
    },
    {
      "name": "tokensWithdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "schedule",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
