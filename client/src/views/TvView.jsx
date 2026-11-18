import { useEffect, useRef, useState } from "react";

function playChime() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const now = ctx.currentTime;
  [880, 1175].forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const start = now + index * 0.18;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
    osc.start(start);
    osc.stop(start + 0.3);
  });
  setTimeout(() => ctx.close(), 800);
}

export default function TvView({ queue, connected, onExit }) {
  const [clock, setClock] = useState(() => new Date());
  const servingNumber = queue.serving?.number || "";

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const skipFirstChime = useRef(true);

  useEffect(() => {
    if (skipFirstChime.current) {
      skipFirstChime.current = false;
      return;
    }
    if (servingNumber) playChime();
  }, [servingNumber]);

  const time = clock.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex min-h-screen flex-col bg-[#071633] text-white">
      <header className="flex items-center justify-between px-6 py-5 sm:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-extrabold text-[#071633]">
            Q
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight">Smart Queue</p>
            <p className="text-sm text-blue-200">{connected ? "Live display" : "Reconnecting"}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-2xl font-semibold tabular-nums text-blue-100">{time}</p>
          <button
            type="button"
            onClick={onExit}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-blue-100 hover:bg-white/10"
          >
            Exit display
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-xl font-semibold uppercase tracking-[0.45em] text-blue-200 sm:text-3xl">
          Now serving
        </p>
        <p className="mt-4 text-[7.5rem] font-extrabold leading-none tracking-tight sm:text-[12rem]">
          {queue.serving?.number || "—"}
        </p>
        <p className="mt-6 text-2xl font-semibold text-blue-100 sm:text-4xl">
          {queue.serving?.name || "Please wait"}
        </p>
      </main>

      <footer className="border-t border-white/10 px-6 py-8 sm:px-12">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-300">Next</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {queue.nextNumbers?.length ? (
            queue.nextNumbers.map((number) => (
              <span
                key={number}
                className="min-w-24 rounded-2xl bg-white px-6 py-4 text-center text-4xl font-extrabold text-[#071633] sm:text-5xl"
              >
                {number}
              </span>
            ))
          ) : (
            <span className="text-2xl font-semibold text-blue-200">No tokens waiting</span>
          )}
        </div>
      </footer>
    </div>
  );
}
