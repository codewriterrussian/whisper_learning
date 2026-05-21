import { spawn } from "node:child_process";

const host = process.env.FRONTEND_HOST || "127.0.0.1";
const port = process.env.FRONTEND_PORT || "6173";
const viteBin = process.platform === "win32" ? "vite.cmd" : "vite";

const child = spawn(viteBin, ["--host", host, "--port", port, "--strictPort"], {
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
