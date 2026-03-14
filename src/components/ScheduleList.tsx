import { Link } from "react-router-dom";
import { PaymentSchedule } from "../types";
import { formatTokenAmount } from "../utils/format";

interface Props {
  schedules: PaymentSchedule[];
}

export function ScheduleList({ schedules }: Props) {
  if (schedules.length === 0) {
    return (
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-8 text-center">
        <p className="text-slate-500 text-sm">
          No schedules found. Create one below.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Your Schedules
        </h2>
      </div>
      <div className="divide-y divide-slate-800">
        {schedules.map((s) => {
          const totalRemaining = s.schedule.reduce(
            (acc, p) => acc + p.amount,
            0n,
          );
          return (
            <Link
              key={s.publicKey.toBase58()}
              to={`/schedule/${s.scheduleId.toString()}`}
              className="block px-6 py-4 hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">
                    Schedule #{s.scheduleId.toString()}
                  </p>
                  <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
                    {s.recipient.toBase58()}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">
                      {formatTokenAmount(totalRemaining)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {s.tokenType} remaining
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-300">
                      {s.schedule.length}
                    </p>
                    <p className="text-xs text-slate-500">pending</p>
                  </div>
                  <span className="text-slate-600 text-lg">&rsaquo;</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
