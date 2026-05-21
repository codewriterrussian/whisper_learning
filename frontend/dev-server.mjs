import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const host = process.env.FRONTEND_HOST || "127.0.0.1";
const port = process.env.FRONTEND_PORT || "6173";
const __dirname = dirname(fileURLToPath(import.meta.url));
const viteScript = join(__dirname, "node_modules", "vite", "bin", "vite.js");

if (!existsSync(viteScript)) {
  console.error("Vite is not installed. Run npm install in the frontend folder.");
  process.exit(1);
}

const child = spawn(process.execPath, [viteScript, "--host", host, "--port", port, "--strictPort"], {
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
