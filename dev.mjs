import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function start(name, cwd) {
  const child = spawn(npm, ["run", "dev"], {
    cwd,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  child.on("exit", (code) => {
    console.log(`[${name}] exited with code ${code ?? "null"}`);
    process.exit(code ?? 1);
  });
  return child;
}

const server = start("server", path.join(root, "server"));
const client = start("client", path.join(root, "client"));

function shutdown() {
  server.kill();
  client.kill();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
