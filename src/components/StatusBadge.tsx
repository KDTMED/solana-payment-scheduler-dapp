interface Props {
  ok: boolean;
  label?: string;
}

export function StatusBadge({ ok, label }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
        ok
          ? "bg-emerald-500/20 text-emerald-400"
          : "bg-red-500/20 text-red-400"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} />
      {label ?? (ok ? "OK" : "Low")}
    </span>
  );
}
