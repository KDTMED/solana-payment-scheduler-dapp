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
      "docs": [
        "Closes the payment schedule PDA and returns its rent to the authority."
      ],
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
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "paymentSchedule"
          ]
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
          "name": "destinationTokenAccount",
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
      "name": "reportPaymentFailure",
      "discriminator": [
        112,
        6,
        186,
        146,
        60,
        34,
        72,
        214
      ],
      "accounts": [
        {
          "name": "paymentSchedule"
        },
        {
          "name": "caller",
          "signer": true
        }
      ],
      "args": [
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
        }
      ]
    },
    {
      "name": "triggerPayment",
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
          "name": "paymentRecord",
          "writable": true
        },
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "paymentIndex",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "paymentRecord",
      "discriminator": [
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
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "insufficientFunds",
      "msg": "Insufficient funds for the next payment"
    },
    {
      "code": 6001,
      "name": "insufficientGasFunds",
      "msg": "Insufficient funds to cover gas fees"
    },
    {
      "code": 6002,
      "name": "noPaymentsScheduled",
      "msg": "No payments scheduled"
    },
    {
      "code": 6003,
      "name": "noPaymentsDue",
      "msg": "No payments due at this time"
    },
    {
      "code": 6004,
      "name": "scheduleTooLarge",
      "msg": "Schedule exceeds maximum of 50 payments"
    },
    {
      "code": 6005,
      "name": "invalidPaymentAmount",
      "msg": "Payment amount must be greater than zero"
    },
    {
      "code": 6006,
      "name": "invalidPaymentIndex",
      "msg": "Payment index does not match expected next index"
    },
    {
      "code": 6007,
      "name": "scheduleOverflow",
      "msg": "Executed payment counter overflow"
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
      "name": "paymentRecord",
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
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "executedAt",
            "type": "i64"
          },
          {
            "name": "paymentIndex",
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
      "name": "paymentSchedule",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "destinationTokenAccount",
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
            "docs": [
              "Monotonic counter tracking the number of executed payments.",
              "Used to enforce deterministic `payment_index` values and prevent",
              "PDA slot squatting on `PaymentRecord`."
            ],
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
    }
  ]
};
