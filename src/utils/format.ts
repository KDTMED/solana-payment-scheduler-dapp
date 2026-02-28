import { TOKEN_DECIMALS } from "../constants";

export function formatTokenAmount(raw: bigint, decimals = TOKEN_DECIMALS): string {
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const frac = raw % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : `${whole}`;
}

export function formatSol(lamports: number): string {
  return (lamports / 1e9).toFixed(4);
}

export function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toLocaleString();
}

export function isOverdue(unix: number): boolean {
  return unix <= Date.now() / 1000;
}

export function durationFromNow(unix: number): string {
  const diff = unix - Date.now() / 1000;
  if (diff < 0) return "Overdue";
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 24) return `in ${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}
