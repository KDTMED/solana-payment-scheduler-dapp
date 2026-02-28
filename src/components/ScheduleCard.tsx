import { PaymentSchedule } from "../types";
import { formatTokenAmount } from "../utils/format";

interface Props {
  schedule: PaymentSchedule | null;
}

export function ScheduleCard({ schedule }: Props) {
  if (!schedule) return null;

  const totalRemaining = schedule.schedule.reduce(
    (acc, p) => acc + p.amount,
    0n
  );

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
            Payment Schedule
          </p>
          <p className="text-xs text-slate-500 font-mono break-all">
            {schedule.publicKey.toBase58()}
          </p>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <p className="text-2xl font-bold text-white">
              {schedule.schedule.length}
            </p>
            <p className="text-xs text-slate-500">Pending</p>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <p className="text-2xl font-bold text-white">
              {formatTokenAmount(totalRemaining)}
            </p>
            <p className="text-xs text-slate-500">
              Total {schedule.tokenType} remaining
            </p>
          </div>
          <div className="border-l border-slate-800 pl-6">
            <p className="text-2xl font-bold text-white">
              {schedule.tokenType}
            </p>
            <p className="text-xs text-slate-500">Token type</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500">
        <div>
          <span className="text-slate-600">Recipient: </span>
          <span className="font-mono text-slate-400">
            {schedule.recipient.toBase58().slice(0, 20)}…
          </span>
        </div>
        <div>
          <span className="text-slate-600">Destination ATA: </span>
          <span className="font-mono text-slate-400">
            {schedule.destinationTokenAccount.toBase58().slice(0, 20)}…
          </span>
        </div>
      </div>
    </div>
  );
}
