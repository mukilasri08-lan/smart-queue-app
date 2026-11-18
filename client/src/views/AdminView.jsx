function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatPhone(phone) {
  if (!phone || phone.length !== 10) return phone || "—";
  return `${phone.slice(0, 5)} ${phone.slice(5)}`;
}

export default function AdminView({ queue, busyAction, adminError, connected, onCallNext, onSkip }) {
  const canAct = connected && (queue.serving || queue.waiting.length > 0);
  const waitingMinutes = (index) => (index + (queue.serving ? 1 : 0)) * (queue.avgMinutes || 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Counter</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-blue-950">Admin dashboard</h1>
        </div>
        <p className="text-sm text-slate-500">Call the next guest or skip the current token.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_280px]">
        <article className="rounded-3xl bg-[#0b2a66] p-6 text-white shadow-card sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Now serving</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <p className="text-7xl font-extrabold tracking-tight">{queue.serving?.number || "—"}</p>
            <p className="pb-2 text-right text-lg font-semibold text-blue-100">
              {queue.serving?.name || "No active token"}
            </p>
          </div>
        </article>
        <article className="rounded-3xl border border-blue-100 bg-white p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total served today</p>
          <p className="mt-3 text-6xl font-extrabold tracking-tight text-blue-700">{queue.servedToday || 0}</p>
          <p className="mt-2 text-sm text-slate-500">Completed tokens at this counter</p>
        </article>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onCallNext}
          disabled={!canAct || busyAction}
          className="rounded-2xl bg-blue-700 px-6 py-6 text-xl font-extrabold text-white shadow-card transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {busyAction === "next" ? "Calling…" : "Call next token"}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={!canAct || busyAction}
          className="rounded-2xl border-2 border-blue-200 bg-white px-6 py-6 text-xl font-extrabold text-blue-800 transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        >
          {busyAction === "skip" ? "Skipping…" : "Skip"}
        </button>
      </div>
      {adminError && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{adminError}</p>
      )}
      <p className="text-sm text-slate-500">
        Call next marks the current token as served. Skip passes over it without counting it.
      </p>

      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-extrabold text-blue-950">Waiting tokens</h2>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
            {queue.waiting.length}
          </span>
        </div>
        {queue.waiting.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">The waiting list is clear.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Token</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3">Joined</th>
                  <th className="px-6 py-3">Est. wait</th>
                </tr>
              </thead>
              <tbody>
                {queue.waiting.map((token, index) => (
                  <tr key={token.id} className="border-t border-slate-100">
                    <td className="px-6 py-4 text-lg font-extrabold text-blue-800">{token.number}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{token.name}</td>
                    <td className="px-6 py-4 text-slate-600">{formatPhone(token.phone)}</td>
                    <td className="px-6 py-4 text-slate-600">{formatTime(token.createdAt)}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{waitingMinutes(index)} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
