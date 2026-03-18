import { vi } from "vitest";
import { PublicKey } from "@solana/web3.js";

export const mockPublicKey = new PublicKey("EkJpRbvTaeLyYTr6Cod2sehMTs7rRLfLtwoqV6Kf2G7L");

export const mockWallet = {
  publicKey: mockPublicKey,
  connected: true,
  signTransaction: vi.fn(),
  sendTransaction: vi.fn(),
};

export const mockConnection = {
  getParsedAccountInfo: vi.fn(),
  getAccountInfo: vi.fn().mockResolvedValue({ data: Buffer.alloc(0) }),
  confirmTransaction: vi.fn(),
  getVersion: vi.fn().mockResolvedValue({ "solana-core": "1.0.0" }),
  onAccountChange: vi.fn().mockReturnValue(0),
  removeAccountChangeListener: vi.fn(),
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

vi.mock("../utils/pda", () => {
  const fakePda = new PublicKey("11111111111111111111111111111111");
  return {
    findScheduleCounterPda: () => [fakePda, 255] as [PublicKey, number],
    findProgramConfigPda: () => [fakePda, 255] as [PublicKey, number],
    findAuthorityRegistryPda: () => [fakePda, 255] as [PublicKey, number],
    findPaymentSchedulePda: () => [fakePda, 255] as [PublicKey, number],
  };
});

vi.mock("../hooks/useIsAdmin", () => ({
  useIsAdmin: () => true,
}));
