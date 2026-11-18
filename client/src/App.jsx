import { useEffect, useMemo, useState } from "react";
import AdminView from "./views/AdminView";
import CustomerView from "./views/CustomerView";
import TvView from "./views/TvView";
import { socket } from "./socket";

const TOKEN_KEY = "smartqueue.myToken";
const VIEWS = [
  { id: "customer", label: "Customer" },
  { id: "admin", label: "Admin" },
  { id: "tv", label: "TV Display" },
];

const EMPTY_QUEUE = {
  serving: null,
  waiting: [],
  nextNumbers: [],
  records: [],
  servedToday: 0,
  avgMinutes: 5,
};

function readSavedToken() {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [view, setView] = useState("customer");
  const [queue, setQueue] = useState(EMPTY_QUEUE);
  const [connected, setConnected] = useState(socket.connected);
  const [myToken, setMyToken] = useState(readSavedToken);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState("");
  const [adminError, setAdminError] = useState("");
  const [busyAction, setBusyAction] = useState("");

  useEffect(() => {
    const onUpdate = (next) => setQueue(next);
    const onConnect = () => {
      setConnected(true);
      socket.emit("queue:sync");
    };
    const onDisconnect = () => setConnected(false);

    socket.on("queue:update", onUpdate);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) socket.emit("queue:sync");

    return () => {
      socket.off("queue:update", onUpdate);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  const myRecord = useMemo(() => {
    if (!myToken) return null;
    return queue.records?.find((record) => record.id === myToken.id) || null;
  }, [myToken, queue.records]);

  function saveToken(token) {
    setMyToken(token);
    localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  }

  function clearToken() {
    setMyToken(null);
    localStorage.removeItem(TOKEN_KEY);
    setBookError("");
  }

  function bookToken(form) {
    setBooking(true);
    setBookError("");
    socket.timeout(5000).emit("token:book", form, (err, result) => {
      setBooking(false);
      if (err) {
        setBookError("The server did not respond. Check that it is running on port 3001.");
        return;
      }
      if (!result || result.error) {
        if (result?.token) saveToken(result.token);
        setBookError(result?.error || "Could not book a token.");
        return;
      }
      saveToken(result.token);
    });
  }

  function runAdmin(action) {
    setBusyAction(action);
    setAdminError("");
    const event = action === "skip" ? "admin:skip" : "admin:callNext";
    socket.timeout(5000).emit(event, {}, (err, result) => {
      setBusyAction("");
      if (err) {
        setAdminError("The server did not respond.");
        return;
      }
      if (result?.error) setAdminError(result.error);
    });
  }

  if (view === "tv") {
    return (
      <TvView
        queue={queue}
        connected={connected}
        onExit={() => setView("customer")}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-lg font-extrabold text-white shadow-card">
              Q
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-tight text-blue-950">Smart Queue</p>
              <p className="text-sm text-slate-500">Live token management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />
              {connected ? "Live" : "Reconnecting"}
            </span>
            <nav className="flex rounded-xl bg-slate-100 p-1">
              {VIEWS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                    view === item.id
                      ? "bg-white text-blue-800 shadow-sm"
                      : "text-slate-600 hover:text-blue-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {view === "customer" ? (
          <CustomerView
            queue={queue}
            myToken={myToken}
            myRecord={myRecord}
            booking={booking}
            bookError={bookError}
            connected={connected}
            onBook={bookToken}
            onClear={clearToken}
          />
        ) : (
          <AdminView
            queue={queue}
            busyAction={busyAction}
            adminError={adminError}
            connected={connected}
            onCallNext={() => runAdmin("next")}
            onSkip={() => runAdmin("skip")}
          />
        )}
      </main>
    </div>
  );
}
