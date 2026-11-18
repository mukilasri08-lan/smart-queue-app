import cors from "cors";
import express from "express";
import fs from "fs";
import http from "http";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

const PORT = Number(process.env.PORT) || 3001;
const AVG_SERVICE_MINUTES = 5;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "data", "queue.json");

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function emptyState() {
  return {
    nextNumber: 1,
    servedToday: 0,
    servedDate: todayKey(),
    tokens: [],
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    return {
      ...emptyState(),
      ...parsed,
      tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [],
    };
  } catch {
    return emptyState();
  }
}

const state = loadState();

function saveState() {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(state, null, 2));
}

function rollDayIfNeeded() {
  const today = todayKey();
  if (state.servedDate === today) return;
  state.servedDate = today;
  state.servedToday = 0;
  state.tokens = state.tokens.filter(
    (token) => token.status === "waiting" || token.status === "serving"
  );
  saveState();
}

function padToken(n) {
  return String(n).padStart(3, "0");
}

function snapshot() {
  rollDayIfNeeded();
  const waiting = state.tokens.filter((token) => token.status === "waiting");
  const serving = state.tokens.find((token) => token.status === "serving") || null;

  return {
    serving: serving
      ? { id: serving.id, number: serving.number, name: serving.name }
      : null,
    waiting: waiting.map((token) => ({
      id: token.id,
      number: token.number,
      name: token.name,
      phone: token.phone,
      createdAt: token.createdAt,
    })),
    nextNumbers: waiting.slice(0, 5).map((token) => token.number),
    records: state.tokens.map((token) => ({
      id: token.id,
      number: token.number,
      name: token.name,
      status: token.status,
    })),
    servedToday: state.servedToday,
    avgMinutes: AVG_SERVICE_MINUTES,
    updatedAt: Date.now(),
  };
}

function bookToken(nameRaw, phoneRaw) {
  const name = String(nameRaw || "").trim().replace(/\s+/g, " ");
  const phone = String(phoneRaw || "").replace(/\D/g, "");

  if (name.length < 2 || name.length > 60) {
    return { error: "Enter a name between 2 and 60 characters." };
  }
  if (!/^[0-9]{10}$/.test(phone)) {
    return { error: "Enter a 10-digit phone number." };
  }

  const duplicate = state.tokens.find(
    (token) =>
      token.phone === phone &&
      (token.status === "waiting" || token.status === "serving")
  );
  if (duplicate) {
    return {
      error: `This phone number already holds token ${duplicate.number}.`,
      token: {
        id: duplicate.id,
        number: duplicate.number,
        name: duplicate.name,
        phone: duplicate.phone,
        status: duplicate.status,
      },
    };
  }

  const token = {
    id: randomUUID(),
    number: padToken(state.nextNumber),
    name,
    phone,
    status: "waiting",
    createdAt: Date.now(),
  };
  state.nextNumber += 1;
  state.tokens.push(token);
  saveState();
  return {
    token: {
      id: token.id,
      number: token.number,
      name: token.name,
      phone: token.phone,
      status: token.status,
    },
  };
}

function callNext() {
  const current = state.tokens.find((token) => token.status === "serving");
  if (current) {
    current.status = "served";
    state.servedToday += 1;
  }
  const next = state.tokens.find((token) => token.status === "waiting");
  if (next) next.status = "serving";
  saveState();
  return snapshot();
}

function skipCurrent() {
  const current = state.tokens.find((token) => token.status === "serving");
  if (current) {
    current.status = "skipped";
  } else {
    const firstWaiting = state.tokens.find((token) => token.status === "waiting");
    if (firstWaiting) firstWaiting.status = "skipped";
  }
  const next = state.tokens.find((token) => token.status === "waiting");
  if (next) next.status = "serving";
  saveState();
  return snapshot();
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/queue", (_req, res) => {
  res.json(snapshot());
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

function broadcast() {
  io.emit("queue:update", snapshot());
}

io.on("connection", (socket) => {
  socket.emit("queue:update", snapshot());

  socket.on("queue:sync", () => {
    socket.emit("queue:update", snapshot());
  });

  socket.on("token:book", (payload, ack) => {
    const result = bookToken(payload?.name, payload?.phone);
    if (result.token && !result.error) broadcast();
    if (typeof ack === "function") ack(result);
  });

  socket.on("admin:callNext", (_payload, ack) => {
    const queue = snapshot();
    if (!queue.serving && queue.waiting.length === 0) {
      if (typeof ack === "function") {
        ack({ error: "The queue is empty." });
      }
      return;
    }
    callNext();
    const nextQueue = snapshot();
    broadcast();
    if (typeof ack === "function") ack({ ok: true, queue: nextQueue });
  });

  socket.on("admin:skip", (_payload, ack) => {
    const queue = snapshot();
    if (!queue.serving && queue.waiting.length === 0) {
      if (typeof ack === "function") {
        ack({ error: "Nothing to skip." });
      }
      return;
    }
    skipCurrent();
    const nextQueue = snapshot();
    broadcast();
    if (typeof ack === "function") ack({ ok: true, queue: nextQueue });
  });
});

rollDayIfNeeded();

httpServer.listen(PORT, () => {
  console.log(`Smart Queue server listening on http://localhost:${PORT}`);
});
