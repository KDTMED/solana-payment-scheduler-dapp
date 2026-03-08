import { vi } from "vitest";
import { PublicKey } from "@solana/web3.js";

// Stub out the wallet adapter modules so components that call
// useWallet() / useConnection() don't require a real provider tree.

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
