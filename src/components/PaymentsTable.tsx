import { PaymentSchedule, PaymentRecord } from "../types";
import {
  formatTokenAmount,
  formatTimestamp,
  durationFromNow,
  isOverdue,
} from "../utils/format";

interface Props {
  schedule: PaymentSchedule | null;
  records: PaymentRecord[];
  tokenType: string;
}

export function PaymentsTable({ schedule, records, tokenType }: Props) {
  const upcoming = schedule?.schedule ?? [];

  return (
    <div className="space-y-6">
      {/* Upcoming / future payments */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Scheduled Payments
          </h2>
          <span className="text-xs text-slate-500">{upcoming.length} pending</span>
        </div>

        {upcoming.length === 0 ? (
          <p className="px-6 py-8 text-slate-500 text-sm text-center">
            No payments scheduled.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs border-b border-slate-800">
                <th className="px-6 py-3 font-medium">#</th>
                <th className="px-6 py-3 font-medium">Scheduled For</th>
                <th className="px-6 py-3 font-medium">Time</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((p, i) => {
                const overdue = isOverdue(p.timestamp);
                return (
                  <tr
                    key={i}
                    className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-6 py-3 text-white">
                      {formatTimestamp(p.timestamp)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`text-xs ${
                          overdue ? "text-amber-400" : "text-slate-400"
                        }`}
                      >
                        {durationFromNow(p.timestamp)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-white">
                      {formatTokenAmount(p.amount)}{" "}
                      <span className="text-slate-500 text-xs">{tokenType}</span>
                    </td>
                    <td className="px-6 py-3">
                      {overdue ? (
                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                          Due
                        </span>
                      ) : (
                        <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Historical payments */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Payment History
          </h2>
          <span className="text-xs text-slate-500">{records.length} completed</span>
        </div>

        {records.length === 0 ? (
          <p className="px-6 py-8 text-slate-500 text-sm text-center">
            No payments executed yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs border-b border-slate-800">
                <th className="px-6 py-3 font-medium">Index</th>
                <th className="px-6 py-3 font-medium">Scheduled For</th>
                <th className="px-6 py-3 font-medium">Executed At</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr
                  key={r.publicKey.toBase58()}
                  className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-3 text-slate-500">#{r.paymentIndex}</td>
                  <td className="px-6 py-3 text-slate-300">
                    {formatTimestamp(r.timestamp)}
                  </td>
                  <td className="px-6 py-3 text-white">
                    {formatTimestamp(r.executedAt)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-white">
                    {formatTokenAmount(r.amount)}{" "}
                    <span className="text-slate-500 text-xs">{tokenType}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                      Executed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
