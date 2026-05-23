#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(path.dirname(__filename), "..");

function commandExists(command, args = ["--version"]) {
  try {
    const result = spawnSync(command, args, {
      cwd: ROOT,
      encoding: "utf8",
      shell: process.platform === "win32",
      timeout: 8000,
    });
    return {
      ok: result.status === 0,
      detail: (result.stdout || result.stderr || "").split(/\r?\n/)[0].trim(),
    };
  } catch (_error) {
    return { ok: false, detail: "" };
  }
}

function findFileRecursive(root, filename, maxDepth = 6) {
  if (!root || !fs.existsSync(root)) {
    return "";
  }

  const queue = [{ dir: root, depth: 0 }];
  while (queue.length) {
    const { dir, depth } = queue.shift();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_error) {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === filename.toLowerCase()) {
        return fullPath;
      }
      if (entry.isDirectory() && depth < maxDepth) {
        queue.push({ dir: fullPath, depth: depth + 1 });
      }
    }
  }

  return "";
}

function findFfmpegCommand() {
  const ffmpeg = commandExists("ffmpeg");
  if (ffmpeg.ok) {
    return { command: "ffmpeg", detail: ffmpeg.detail };
  }

  if (process.platform !== "win32") {
    return null;
  }

  const candidatePaths = [
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, "ffmpeg", "bin", "ffmpeg.exe") : "",
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, "Gyan", "FFmpeg", "bin", "ffmpeg.exe") : "",
    process.env["ProgramFiles(x86)"] ? path.join(process.env["ProgramFiles(x86)"], "ffmpeg", "bin", "ffmpeg.exe") : "",
    "C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe",
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
  ];
  const searchRoots = [
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft", "WinGet", "Packages") : "",
    "C:\\ffmpeg",
  ];

  for (const ffmpegPath of candidatePaths) {
    if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
      continue;
    }
    const result = spawnSync(ffmpegPath, ["--version"], {
      cwd: ROOT,
      encoding: "utf8",
      shell: false,
      timeout: 8000,
    });
    if (result.status === 0) {
      const detail = (result.stdout || result.stderr || "").split(/\r?\n/)[0].trim();
      process.env.Path = `${path.dirname(ffmpegPath)};${process.env.Path || ""}`;
      process.env.PATH = `${path.dirname(ffmpegPath)};${process.env.PATH || ""}`;
      return { command: ffmpegPath, detail: detail || ffmpegPath };
    }
  }

  for (const root of searchRoots) {
    const ffmpegPath = findFileRecursive(root, "ffmpeg.exe");
    if (!ffmpegPath) {
      continue;
    }
    const result = spawnSync(ffmpegPath, ["--version"], {
      cwd: ROOT,
      encoding: "utf8",
      shell: false,
      timeout: 8000,
    });
    if (result.status === 0) {
      const detail = (result.stdout || result.stderr || "").split(/\r?\n/)[0].trim();
      process.env.Path = `${path.dirname(ffmpegPath)};${process.env.Path || ""}`;
      process.env.PATH = `${path.dirname(ffmpegPath)};${process.env.PATH || ""}`;
      return { command: ffmpegPath, detail: detail || ffmpegPath };
    }
  }

  return null;
}

function getPythonCommand() {
  if (process.env.PYTHON) {
    return { command: process.env.PYTHON, args: [] };
  }
  const venvPython = process.platform === "win32"
    ? path.join(ROOT, ".venv", "Scripts", "python.exe")
    : path.join(ROOT, ".venv", "bin", "python");
  if (fs.existsSync(venvPython)) {
    return { command: venvPython, args: [] };
  }
  if (process.platform === "win32") {
    const py = commandExists("py", ["-3", "--version"]);
    if (py.ok) {
      return { command: "py", args: ["-3"] };
    }
  }
  if (commandExists("python3").ok) {
    return { command: "python3", args: [] };
  }
  if (commandExists("python").ok) {
    return { command: "python", args: [] };
  }
  return null;
}

function runPythonSnippet(pythonCommand, code) {
  if (!pythonCommand) {
    return { ok: false, detail: "Python is missing." };
  }
  const result = spawnSync(pythonCommand.command, [...pythonCommand.args, "-c", code], {
    cwd: ROOT,
    encoding: "utf8",
    shell: false,
    timeout: 12000,
  });
  return {
    ok: result.status === 0,
    detail: (result.stdout || result.stderr || "").split(/\r?\n/)[0].trim(),
  };
}

function status(ok, detail = "", fix = "") {
  return {
    ok,
    status: ok ? "OK" : "Missing",
    detail,
    fix,
  };
}

function checkWritableDirs() {
  const dirs = ["recordings", "recordings/uploads", "recordings/processed_audio", "targets", "transcripts", "results", "model_audio", "runs", "generated_reports"];
  const failed = [];
  for (const dir of dirs) {
    const fullPath = path.join(ROOT, dir);
    try {
      fs.mkdirSync(fullPath, { recursive: true });
      fs.accessSync(fullPath, fs.constants.W_OK);
    } catch (_error) {
      failed.push(dir);
    }
  }
  return status(failed.length === 0, failed.length ? `Cannot write: ${failed.join(", ")}` : "Runtime folders are writable.", "Move the app to a folder you can write to, such as Documents.");
}

function checkPlatformStt() {
  if (process.platform === "darwin") {
    const swift = commandExists("swift");
    return status(swift.ok, swift.ok ? "Apple Speech helper can be built with Swift." : "Swift was not found for Apple Speech.", "Install Xcode Command Line Tools, or use Whisper only.");
  }
  if (process.platform === "win32") {
    return status(true, "Windows Speech is not used by this release. Whisper remains the recommended provider.");
  }
  return status(true, "No native STT provider is configured for this platform. Use Whisper only.");
}

function runDoctor() {
  const pythonCommand = getPythonCommand();
  const python = pythonCommand
    ? runPythonSnippet(pythonCommand, "import sys; print(sys.version.split()[0])")
    : { ok: false, detail: "" };
  const node = commandExists("node");
  const npm = commandExists(process.platform === "win32" ? "npm.cmd" : "npm");
  const ffmpegCommand = findFfmpegCommand();
  const ffmpeg = ffmpegCommand
    ? { ok: true, detail: ffmpegCommand.detail }
    : { ok: false, detail: "" };
  const whisper = runPythonSnippet(pythonCommand, "import whisper; print('openai-whisper available')");
  const backendDeps = status(fs.existsSync(path.join(ROOT, "backend", "node_modules")), "backend/node_modules", "Run the setup script first.");
  const frontendDeps = status(fs.existsSync(path.join(ROOT, "frontend", "node_modules")), "frontend/node_modules", "Run the setup script first.");

  return {
    ok: Boolean(python.ok && node.ok && npm.ok && ffmpeg.ok && whisper.ok && backendDeps.ok && frontendDeps.ok),
    platform: process.platform,
    arch: process.arch,
    home: os.homedir(),
    checks: {
      python: status(python.ok, python.ok ? `Python ${python.detail}` : "Python 3.10 or newer was not found.", "Install Python 3.10 or newer, then run setup again."),
      node: status(node.ok, node.ok ? node.detail : "Node.js was not found.", "Install Node.js LTS, then run setup again."),
      npm: status(npm.ok, npm.ok ? npm.detail : "npm was not found.", "Install Node.js LTS, then run setup again."),
      ffmpeg: status(ffmpeg.ok, ffmpeg.ok ? ffmpeg.detail : "FFmpeg is missing. This app needs FFmpeg to process your audio.", "Install FFmpeg, then run setup again."),
      whisper: status(whisper.ok, whisper.ok ? whisper.detail : "Whisper Python package is missing.", "Run: python -m pip install -r requirements.txt"),
      backendDependencies: backendDeps,
      frontendDependencies: frontendDeps,
      platformStt: checkPlatformStt(),
      runtimeFolders: checkWritableDirs(),
    },
  };
}

function printDoctor(result) {
  console.log("Whisper Speaking Practice System Check");
  console.log(`Platform: ${result.platform} ${result.arch}`);
  for (const [name, check] of Object.entries(result.checks)) {
    const label = name.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
    console.log(`${label}: ${check.status}${check.detail ? ` - ${check.detail}` : ""}`);
    if (!check.ok && check.fix) {
      console.log(`  Fix: ${check.fix}`);
    }
  }
}

module.exports = { runDoctor };

if (require.main === module) {
  const result = runDoctor();
  printDoctor(result);
  process.exit(result.ok ? 0 : 1);
}
