import { describe, it, expect, vi, beforeEach } from "vitest";

describe("config", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("defaults to devnet cluster", async () => {
    vi.stubEnv("VITE_SOLANA_CLUSTER", "devnet");
    const config = await import("./config");
    expect(config.CLUSTER).toBe("devnet");
  });

  it("normalises 'mainnet' to 'mainnet-beta'", async () => {
    vi.stubEnv("VITE_SOLANA_CLUSTER", "mainnet");
    const config = await import("./config");
    expect(config.CLUSTER).toBe("mainnet-beta");
  });

  it("normalises 'localhost' to 'localnet'", async () => {
    vi.stubEnv("VITE_SOLANA_CLUSTER", "localhost");
    const config = await import("./config");
    expect(config.CLUSTER).toBe("localnet");
  });

  it("getEndpoint returns localhost URL for localnet", async () => {
    vi.stubEnv("VITE_SOLANA_CLUSTER", "localnet");
    const config = await import("./config");
    expect(config.getEndpoint()).toBe("http://127.0.0.1:8899");
  });

  it("getEndpoint uses custom RPC URL when provided", async () => {
    vi.stubEnv("VITE_SOLANA_CLUSTER", "devnet");
    vi.stubEnv("VITE_SOLANA_RPC_URL", "https://my-custom-rpc.com");
    const config = await import("./config");
    expect(config.getEndpoint()).toBe("https://my-custom-rpc.com");
  });

  it("explorerClusterParam returns empty for mainnet-beta", async () => {
    vi.stubEnv("VITE_SOLANA_CLUSTER", "mainnet-beta");
    const config = await import("./config");
    expect(config.explorerClusterParam()).toBe("");
  });

  it("explorerClusterParam returns custom URL for localnet", async () => {
    vi.stubEnv("VITE_SOLANA_CLUSTER", "localnet");
    const config = await import("./config");
    expect(config.explorerClusterParam()).toContain("custom");
  });

  it("explorerClusterParam returns ?cluster=devnet for devnet", async () => {
    vi.stubEnv("VITE_SOLANA_CLUSTER", "devnet");
    const config = await import("./config");
    expect(config.explorerClusterParam()).toBe("?cluster=devnet");
  });

  it("clusterLabel returns Mainnet for mainnet-beta", async () => {
    vi.stubEnv("VITE_SOLANA_CLUSTER", "mainnet-beta");
    const config = await import("./config");
    expect(config.clusterLabel()).toBe("Mainnet");
  });

  it("clusterLabel returns Localnet for localnet", async () => {
    vi.stubEnv("VITE_SOLANA_CLUSTER", "localnet");
    const config = await import("./config");
    expect(config.clusterLabel()).toBe("Localnet");
  });

  it("clusterLabel returns Devnet for devnet", async () => {
    vi.stubEnv("VITE_SOLANA_CLUSTER", "devnet");
    const config = await import("./config");
    expect(config.clusterLabel()).toBe("Devnet");
  });
});
