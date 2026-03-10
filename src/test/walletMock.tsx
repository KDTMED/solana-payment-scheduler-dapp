import { vi } from "vitest";
import { PublicKey } from "@solana/web3.js";

export const mockPublicKey = new PublicKey("11111111111111111111111111111111");

export const mockWallet = {
  publicKey: mockPublicKey,
  connected: true,
  signTransaction: vi.fn(),
  sendTransaction: vi.fn(),
};

export const mockConnection = {
  getParsedAccountInfo: vi.fn(),
  confirmTransaction: vi.fn(),
  getVersion: vi.fn().mockResolvedValue({ "solana-core": "1.0.0" }),
};

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => mockWallet,
  useConnection: () => ({ connection: mockConnection }),
}));

vi.mock("@solana/wallet-adapter-react-ui", () => ({
  WalletMultiButton: ({ className }: { className?: string }) => (
    <button className={className}>Connect Wallet</button>
  ),
}));
