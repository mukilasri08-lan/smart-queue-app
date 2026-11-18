import { useState } from "react";

function waitInfo(queue, record) {
  if (!record) {
    return { minutes: null, detail: "Book a token to join the line.", tone: "idle" };
  }
  if (record.status === "serving") {
    return { minutes: 0, detail: "Please proceed to the counter.", tone: "now" };
  }
  if (record.status === "served") {
    return { minutes: 0, detail: "This token has been served.", tone: "done" };
  }
  if (record.status === "skipped") {
    return { minutes: null, detail: "This token was skipped. You can book again.", tone: "skipped" };
  }

  const index = queue.waiting.findIndex((token) => token.id === record.id);
  if (index < 0) {
    return { minutes: null, detail: "Looking up your place in line…", tone: "idle" };
  }
  const ahead = index + (queue.serving ? 1 : 0);
  return {
    minutes: ahead * (queue.avgMinutes || 5),
    detail: ahead === 0 ? "You are next." : `${ahead} ahead of you`,
    tone: "wait",
    position: index + 1,
  };
}

export default function CustomerView({
  queue,
  myToken,
  myRecord,
  booking,
  bookError,
  connected,
  onBook,
  onClear,
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [localError, setLocalError] = useState("");
  const info = waitInfo(queue, myRecord);
  const active = myRecord && (myRecord.status === "waiting" || myRecord.status === "serving");

  function submit(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setLocalError("Enter your name.");
      return;
    }
    if (!/^[0-9]{10}$/.test(phone)) {
      setLocalError("Enter a 10-digit phone number.");
      return;
    }
    setLocalError("");
    onBook({ name: trimmed, phone });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-card sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Customer</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-blue-950">Book a token</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Join the queue with your name and phone number. Your token stays on this device.
        </p>

        {active ? (
          <div className="mt-8 rounded-2xl bg-blue-700 px-6 py-8 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">Your token</p>
            <p className="mt-2 text-7xl font-extrabold tracking-tight">{myToken.number}</p>
            <p className="mt-3 text-blue-100">{myToken.name}</p>
            <p className="mt-6 text-sm text-blue-100">
              {myRecord.status === "serving"
                ? "You are being served now."
                : "Keep this screen open. The status updates live."}
            </p>
            <button type="button" onClick={onClear} className="mt-4 text-sm font-semibold text-blue-100 underline">
              Book for someone else on this device
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Alex Morgan"
                autoComplete="name"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-blue-600 transition focus:bg-white focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Phone number</span>
              <input
                value={phone}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
                autoComplete="tel"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-blue-600 transition focus:bg-white focus:ring-2"
              />
            </label>
            {(localError || bookError) && (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {localError || bookError}
              </p>
            )}
            <button
              type="submit"
              disabled={booking || !connected}
              className="w-full rounded-xl bg-blue-700 px-4 py-3.5 text-base font-bold text-white shadow-card transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {booking ? "Booking…" : "Get token"}
            </button>
            {myRecord && (myRecord.status === "served" || myRecord.status === "skipped") && (
              <button
                type="button"
                onClick={onClear}
                className="w-full text-sm font-semibold text-blue-700"
              >
                Book another token
              </button>
            )}
          </form>
        )}
      </section>

      <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Live</p>
            <h2 className="mt-2 text-2xl font-extrabold text-blue-950">Queue status</h2>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            Updates instantly
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl bg-[#0b2a66] p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
              Current serving
            </p>
            <p className="mt-3 text-5xl font-extrabold tracking-tight">
              {queue.serving?.number || "—"}
            </p>
            <p className="mt-2 text-sm text-blue-100">{queue.serving?.name || "Waiting for the counter"}</p>
          </article>
          <article className="rounded-2xl bg-blue-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Your token</p>
            <p className="mt-3 text-5xl font-extrabold tracking-tight text-blue-950">
              {myToken?.number || "—"}
            </p>
            <p className="mt-2 text-sm font-medium capitalize text-slate-600">
              {myRecord?.status || "Not booked"}
            </p>
          </article>
        </div>

        <article className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Estimated wait
          </p>
          <p className="mt-2 text-4xl font-extrabold text-blue-950">
            {info.tone === "now"
              ? "Now"
              : info.tone === "done"
                ? "Done"
                : info.minutes == null
                  ? "—"
                  : info.minutes === 0
                    ? "Next"
                    : `${info.minutes} min`}
          </p>
          <p className="mt-2 text-sm text-slate-600">{info.detail}</p>
          {info.position && (
            <p className="mt-1 text-sm font-semibold text-blue-700">Position {info.position} in line</p>
          )}
        </article>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Coming up</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {queue.nextNumbers?.length ? (
              queue.nextNumbers.map((number) => (
                <span
                  key={number}
                  className="rounded-xl bg-white px-4 py-2 text-lg font-bold text-blue-900 ring-1 ring-blue-100"
                >
                  {number}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">No one is waiting.</span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
