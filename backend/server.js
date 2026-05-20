import cors from "cors";
import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { buildCanonicalResult, buildRunPaths, createAttemptId, toRootRelative as toRootRelativePath } from "./run_storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const PORT = process.env.PORT || 6174;
const PYTHON = process.env.PYTHON || "python";
const EDGE_TTS_PYTHON = process.env.EDGE_TTS_PYTHON || PYTHON;
const DEFAULT_WHISPER_MODEL = "large";
const ALLOWED_LANGUAGES = new Set(["en", "de", "nl", "pl", "ru", "ja", "vi", "zh"]);
const ALLOWED_WHISPER_MODELS = new Set(["tiny", "base", "small", "medium", "large", "large-v3", "large-v3-turbo", "turbo"]);
const ALLOWED_WHISPER_DEVICES = new Set(["auto", "cpu", "mps"]);
const ALLOWED_STT_PROVIDERS = new Set(["whisper", "apple", "both"]);
const FILLER_NOISE_TOKENS = new Set([
  "ah",
  "eh",
  "er",
  "hm",
  "hmm",
  "hmmm",
  "mm",
  "mmm",
  "uh",
  "um",
  "umm",
  "noise",
  "silence",
  "inaudible",
  "unintelligible",
  "unknown",
  "background",
  "music",
]);
const VOICES_BY_LANGUAGE = {
  en: "en-US-JennyNeural",
  de: "de-DE-KatjaNeural",
  nl: "nl-NL-ColetteNeural",
  pl: "pl-PL-ZofiaNeural",
  ru: "ru-RU-SvetlanaNeural",
  ja: "ja-JP-NanamiNeural",
  vi: "vi-VN-HoaiMyNeural",
  zh: "zh-CN-XiaoxiaoNeural",
};

const app = express();
const upload = multer({ dest: path.join(ROOT, "recordings", "uploads") });
let sttWorker = null;
let sttWorkerBuffer = "";
let nextSttRequestId = 1;
const pendingSttRequests = new Map();
let practiceRequestInProgress = false;

app.use(cors());
app.use(express.json());
app.use("/model-audio", express.static(path.join(ROOT, "model_audio")));

function ensureDirs() {
  for (const dir of ["recordings", "recordings/uploads", "recordings/processed_audio", "targets", "transcripts", "results", "model_audio", "runs"]) {
    fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
  }
}

function toRootRelative(filePath) {
  return toRootRelativePath(ROOT, filePath);
}

function normalizeLanguage(language) {
  return ALLOWED_LANGUAGES.has(language) ? language : "en";
}

function inferLanguageFromTargetText(targetText) {
  if (/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/u.test(targetText)) {
    return "pl";
  }
  return "";
}

function shouldAutoOverrideLanguage() {
  return process.env.STT_LANGUAGE_AUTO_OVERRIDE === "1";
}

function normalizeWhisperModel(model) {
  if (!model || model === "default") {
    return ALLOWED_WHISPER_MODELS.has(process.env.WHISPER_MODEL) ? process.env.WHISPER_MODEL : DEFAULT_WHISPER_MODEL;
  }

  if (ALLOWED_WHISPER_MODELS.has(model)) {
    return model;
  }

  return ALLOWED_WHISPER_MODELS.has(process.env.WHISPER_MODEL) ? process.env.WHISPER_MODEL : DEFAULT_WHISPER_MODEL;
}

function normalizeWhisperDevice(device) {
  if (ALLOWED_WHISPER_DEVICES.has(device)) {
    return device;
  }

  return ALLOWED_WHISPER_DEVICES.has(process.env.WHISPER_DEVICE) ? process.env.WHISPER_DEVICE : "auto";
}

function normalizeSttProvider(provider) {
  return ALLOWED_STT_PROVIDERS.has(provider) ? provider : "both";
}

function getMetric(text, label) {
  const pattern = new RegExp(`${label}:\\s*([0-9.]+/100)`, "i");
  const match = text.match(pattern);
  return match ? match[1] : "--";
}

function getProviderSection(text, providerName) {
  const pattern = new RegExp(`${providerName} STT:\\n([\\s\\S]*?)(?=\\n\\n[A-Z][A-Za-z ]+ STT:|\\n\\nPractice suggestion:|$)`, "i");
  const match = text.match(pattern);
  return match ? match[1].trim() : "";
}

function getProviderScore(comparison, providerName) {
  const section = getProviderSection(comparison, providerName);
  return section ? getMetric(section, "Exact-style ratio") : getMetric(comparison, "Exact-style ratio");
}

function countWords(text) {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).length;
}

function normalizeTranscriptText(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[\n\r]+/gu, " ")
    .replace(/[^\p{L}\p{N}_\s]/gu, "")
    .replace(/\s+/gu, " ");
}

function getTranscriptValidationDebug(providerName, transcript, reason = "") {
  const text = String(transcript || "");
  const normalized = normalizeTranscriptText(text);
  const nonSpaceChars = Array.from(text).filter((char) => !/\s/u.test(char));
  const symbolCount = nonSpaceChars.filter((char) => !/[\p{L}\p{N}]/u.test(char)).length;
  const symbolRatio = nonSpaceChars.length ? symbolCount / nonSpaceChars.length : 0;
  const words = normalized.match(/[\p{L}\p{N}_]+/gu) || [];
  const alphabeticCount = Array.from(normalized).filter((char) => /\p{L}/u.test(char)).length;
  return [
    "[transcript-validation]",
    `provider=${providerName}`,
    `raw=${JSON.stringify(text)}`,
    `normalized=${JSON.stringify(normalized)}`,
    `alphabetic_count=${alphabeticCount}`,
    `symbol_ratio=${symbolRatio.toFixed(3)}`,
    `words=${JSON.stringify(words)}`,
    `invalid_reason=${JSON.stringify(reason)}`,
  ].join(" ");
}

function validateTranscript(transcript) {
  const text = String(transcript || "").trim();
  if (!text) {
    return { status: "invalid", reason: "empty transcript" };
  }

  const nonSpaceChars = Array.from(text).filter((char) => !/\s/u.test(char));
  if (nonSpaceChars.length === 0) {
    return { status: "invalid", reason: "empty transcript" };
  }

  const compact = nonSpaceChars.join("");
  if (compact.length >= 6 && new Set(Array.from(compact)).size === 1 && !/[\p{L}\p{N}]/u.test(compact[0])) {
    return { status: "invalid", reason: "repeated punctuation" };
  }

  const normalized = normalizeTranscriptText(text);
  if (!/[\p{L}]/u.test(normalized)) {
    return { status: "invalid", reason: "no alphabetic letters after normalization" };
  }

  const words = normalized.match(/[\p{L}\p{N}_]+/gu) || [];
  const alphabeticWords = words.filter((word) => /[\p{L}]/u.test(word));
  const symbolCount = nonSpaceChars.filter((char) => !/[\p{L}\p{N}]/u.test(char)).length;
  if (alphabeticWords.length === 0 && symbolCount / nonSpaceChars.length > 0.85) {
    return { status: "invalid", reason: "no valid language words and mostly punctuation or symbols" };
  }

  if (alphabeticWords.every((word) => FILLER_NOISE_TOKENS.has(word))) {
    return { status: "invalid", reason: "only filler or noise tokens" };
  }

  return { status: "ok", reason: "" };
}

function applyTranscriptValidation(providerName, status, transcript, note = "") {
  if (status !== "ok" && status !== "ok_retry") {
    console.log(getTranscriptValidationDebug(providerName, transcript, note || status));
    return { status, note };
  }

  const validation = validateTranscript(transcript);
  console.log(getTranscriptValidationDebug(providerName, transcript, validation.reason));
  if (validation.status !== "ok") {
    return { status: "invalid", note: validation.reason };
  }

  return { status, note };
}

function convertAudioForStt(sourcePath, wavPath) {
  if (fs.existsSync(wavPath)) {
    const sourceMtime = fs.statSync(sourcePath).mtimeMs;
    const wavMtime = fs.statSync(wavPath).mtimeMs;
    if (wavMtime >= sourceMtime) {
      return Promise.resolve();
    }
  }

  return runCommand("ffmpeg", [
    "-y",
    "-i",
    sourcePath,
    "-ar",
    "16000",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    wavPath,
  ]);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      shell: false,
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`Command failed: ${command} ${args.join(" ")}\n${stderr || stdout}`));
    });
  });
}

function startSttWorker() {
  if (sttWorker && !sttWorker.killed) {
    return sttWorker;
  }

  sttWorkerBuffer = "";
  sttWorker = spawn(PYTHON, ["scripts/stt_worker.py"], {
    cwd: ROOT,
    shell: false,
    env: {
      ...process.env,
      WHISPER_MODEL: process.env.WHISPER_MODEL || DEFAULT_WHISPER_MODEL,
      WHISPER_DEVICE: process.env.WHISPER_DEVICE || "auto",
      WHISPER_RETRY_DEVICE: process.env.WHISPER_RETRY_DEVICE || "same",
    },
  });

  sttWorker.stdout.on("data", (data) => {
    sttWorkerBuffer += data.toString();
    const lines = sttWorkerBuffer.split("\n");
    sttWorkerBuffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      let response;
      try {
        response = JSON.parse(line);
      } catch (error) {
        console.error(`[STT worker] Invalid JSON: ${line}`);
        continue;
      }

      const pending = pendingSttRequests.get(response.id);
      if (!pending) {
        continue;
      }

      pendingSttRequests.delete(response.id);
      if (response.ok) {
        pending.resolve(response.result);
      } else {
        pending.reject(new Error(response.error || "STT worker failed"));
      }
    }
  });

  sttWorker.stderr.on("data", (data) => {
    process.stderr.write(data);
  });

  sttWorker.on("exit", (code) => {
    for (const pending of pendingSttRequests.values()) {
      pending.reject(new Error(`STT worker exited with code ${code}`));
    }
    pendingSttRequests.clear();
    sttWorker = null;
  });

  sttWorker.on("error", (error) => {
    for (const pending of pendingSttRequests.values()) {
      pending.reject(error);
    }
    pendingSttRequests.clear();
    sttWorker = null;
  });

  return sttWorker;
}

function runSttWorker(payload) {
  const worker = startSttWorker();
  const id = nextSttRequestId;
  nextSttRequestId += 1;

  return new Promise((resolve, reject) => {
    pendingSttRequests.set(id, { resolve, reject });
    worker.stdin.write(`${JSON.stringify({ id, ...payload })}\n`, (error) => {
      if (error) {
        pendingSttRequests.delete(id);
        reject(error);
      }
    });
  });
}

function writeTranscriptOutputs(transcriptPath, sttProvider, transcriptResult) {
  fs.mkdirSync(path.dirname(transcriptPath), { recursive: true });

  if (sttProvider === "both") {
    const parsed = transcriptResult;
    const extension = path.extname(transcriptPath);
    const stem = transcriptPath.slice(0, -extension.length);
    fs.writeFileSync(`${stem}.whisper${extension}`, `${parsed.whisper.transcript || ""}\n`, "utf8");
    fs.writeFileSync(`${stem}.apple${extension}`, `${parsed.apple.transcript || ""}\n`, "utf8");
    fs.writeFileSync(transcriptPath, `${parsed.whisper.transcript || ""}\n`, "utf8");
    return;
  }

  const transcript = typeof transcriptResult === "object" && transcriptResult !== null
    ? transcriptResult.transcript || ""
    : transcriptResult || "";
  fs.writeFileSync(transcriptPath, `${transcript}\n`, "utf8");
  const extension = path.extname(transcriptPath);
  const stem = transcriptPath.slice(0, -extension.length);
  if (sttProvider === "whisper") {
    fs.writeFileSync(`${stem}.whisper${extension}`, `${transcript}\n`, "utf8");
  }
  if (sttProvider === "apple") {
    fs.writeFileSync(`${stem}.apple${extension}`, `${transcript}\n`, "utf8");
  }
}

function nowMs() {
  return performance.now();
}

function logTiming(requestStartedAt, label, startedAt) {
  const elapsed = nowMs() - startedAt;
  const total = nowMs() - requestStartedAt;
  console.log(`[timing] ${label}: ${elapsed.toFixed(0)}ms (total ${total.toFixed(0)}ms)`);
  return elapsed;
}

function logAttempt(attemptId, message) {
  console.log(`[attempt ${attemptId}] ${message}`);
}

function logAttemptTiming(attemptId, requestStartedAt, label, startedAt, timings) {
  const elapsed = logTiming(requestStartedAt, label, startedAt);
  timings[label] = Math.round(elapsed);
  logAttempt(attemptId, `${label}: ${elapsed.toFixed(0)}ms`);
  return elapsed;
}

function getValidProviderScore(comparison, providerName, status) {
  return status === "ok" || status === "ok_retry" ? getProviderScore(comparison, providerName) : "--";
}

function getPrimaryTranscript({ whisperStatus, whisperTranscript, appleStatus, appleTranscript }) {
  if (whisperStatus === "ok" || whisperStatus === "ok_retry") {
    return whisperTranscript;
  }
  if (appleStatus === "ok" || appleStatus === "ok_retry") {
    return appleTranscript;
  }
  return "";
}

function getFocusWord(targetText, transcript) {
  const targetWords = targetText.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const transcriptWords = new Set(transcript.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []);
  return targetWords.find((word) => !transcriptWords.has(word)) || "";
}

function buildTeacherFeedbackSummary(comparison, focusWord, audioSimilarity) {
  const feedbackMatch = comparison.match(/Feedback:\n([\s\S]*?)(?=\n\nPractice suggestion:|\n\n[A-Z][A-Za-z ]+ STT:|$)/i);
  const feedback = feedbackMatch ? feedbackMatch[1].trim() : "Review the transcript and try again.";
  const fluencyNote = audioSimilarity?.status === "ok" && Number(audioSimilarity.duration_difference) > 0.4
    ? " Your words were understood, but your pace may differ from the model audio."
    : "";
  return focusWord
    ? `${feedback}${fluencyNote} Focus on "${focusWord}", then record again.`
    : `${feedback}${fluencyNote} Keep the full sentence smooth and record again.`;
}

function formatEdgeTtsError(error) {
  const message = error.message || "";

  if (message.includes("WSServerHandshakeError: 403") || message.includes("Invalid response status")) {
    return [
      "Microsoft Edge TTS rejected the request.",
      "The app now uses the selected Python environment for edge-tts; restart with ./run_web_app.sh.",
      "If this continues, update edge-tts in that environment: python -m pip install -U edge-tts.",
    ].join(" ");
  }

  return message;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "backend running" });
});

app.post("/api/target-audio", async (req, res) => {
  try {
    ensureDirs();

    let language = normalizeLanguage(req.body.language);
    const targetText = (req.body.targetText || "").trim();
    const audioKind = req.body.audioKind === "word" ? "word" : "target";

    if (!targetText) {
      return res.status(400).json({ ok: false, error: "targetText is required" });
    }

    const inferredLanguage = inferLanguageFromTargetText(targetText);
    if (inferredLanguage && inferredLanguage !== language) {
      if (shouldAutoOverrideLanguage()) {
        console.log(`[STT] Target text looks like ${inferredLanguage}; overriding selected language ${language} for target audio.`);
        language = inferredLanguage;
      } else {
        console.log(`[STT] Target text looks like ${inferredLanguage}; keeping selected language ${language}. Set STT_LANGUAGE_AUTO_OVERRIDE=1 to override automatically.`);
      }
    }

    const targetPath = path.join(ROOT, "targets", `${audioKind}.txt`);
    const audioPath = path.join(ROOT, "model_audio", `${audioKind}.mp3`);
    fs.writeFileSync(targetPath, `${targetText}\n`, "utf8");

    await runCommand(EDGE_TTS_PYTHON, [
      "-m",
      "edge_tts",
      "--voice",
      VOICES_BY_LANGUAGE[language],
      "--file",
      targetPath,
      "--write-media",
      audioPath,
    ]);

    res.json({
      ok: true,
      language,
      audioUrl: `/model-audio/${audioKind}.mp3?t=${Date.now()}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: formatEdgeTtsError(error) });
  }
});

app.post("/api/practice", upload.single("audio"), async (req, res) => {
  let uploadedPath = req.file?.path || "";
  const requestStartedAt = nowMs();
  const timingBreakdown = {};
  const attemptId = createAttemptId();
  const createdAt = new Date().toISOString();
  const runPaths = buildRunPaths(ROOT, attemptId);
  const runDir = runPaths.runDir;

  if (practiceRequestInProgress) {
    if (uploadedPath) {
      fs.rmSync(uploadedPath, { force: true });
    }
    return res.status(429).json({
      ok: false,
      error: "A recording is already being checked. Wait for it to finish or cancel it before submitting another attempt.",
    });
  }

  practiceRequestInProgress = true;

  try {
    let phaseStartedAt = nowMs();
    ensureDirs();
    fs.mkdirSync(runDir, { recursive: true });
    logAttempt(attemptId, "practice request started");

    let language = normalizeLanguage(req.body.language);
    const sttProvider = normalizeSttProvider(req.body.sttProvider);
    const whisperModel = normalizeWhisperModel(req.body.whisperModel);
    const whisperDevice = normalizeWhisperDevice(req.body.whisperDevice);
    const manualTrimmed = req.body.manualTrimmed === "true";
    const targetText = (req.body.targetText || "").trim();

    if (!targetText) {
      return res.status(400).json({ ok: false, error: "targetText is required" });
    }

    const inferredLanguage = inferLanguageFromTargetText(targetText);
    if (inferredLanguage && inferredLanguage !== language) {
      if (shouldAutoOverrideLanguage()) {
        logAttempt(attemptId, `target text looks like ${inferredLanguage}; overriding selected language ${language} for STT`);
        language = inferredLanguage;
      } else {
        logAttempt(attemptId, `target text looks like ${inferredLanguage}; keeping selected language ${language}. Set STT_LANGUAGE_AUTO_OVERRIDE=1 to override automatically.`);
      }
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, error: "audio is required" });
    }

    uploadedPath = req.file.path;

    const targetPath = runPaths.targetPath;
    const webmPath = runPaths.originalAudioPath;
    const wavPath = runPaths.convertedWavPath;
    const autoTrimmedPath = runPaths.autoTrimmedWavPath;
    const transcriptPath = runPaths.transcriptPath;
    const comparisonPath = runPaths.comparisonPath;
    const resultJsonPath = runPaths.resultJsonPath;

    fs.writeFileSync(targetPath, `${targetText}\n`, "utf8");
    fs.copyFileSync(uploadedPath, webmPath);
    logAttemptTiming(attemptId, requestStartedAt, "audio preparation", phaseStartedAt, timingBreakdown);

    phaseStartedAt = nowMs();
    await convertAudioForStt(webmPath, wavPath);
    logAttemptTiming(attemptId, requestStartedAt, "convert to 16k mono wav", phaseStartedAt, timingBreakdown);

    let scoringAudioPath = wavPath;
    let scoringAudioRelativePath = toRootRelative(wavPath);
    let autoTrim = {
      status: manualTrimmed ? "manual_override" : "not_run",
      path: "",
      silence_removed: 0,
      original_duration: 0,
      trimmed_duration: 0,
    };

    if (!manualTrimmed) {
      try {
        phaseStartedAt = nowMs();
        const autoTrimResult = await runCommand(PYTHON, [
          "scripts/audio_similarity.py",
          toRootRelative(wavPath),
          "--trim-only",
          "--output",
          toRootRelative(autoTrimmedPath),
        ]);
        autoTrim = JSON.parse(autoTrimResult.stdout.trim());
        scoringAudioPath = autoTrimmedPath;
        scoringAudioRelativePath = toRootRelative(autoTrimmedPath);
        logAttemptTiming(attemptId, requestStartedAt, "auto-trim silence", phaseStartedAt, timingBreakdown);
      } catch (trimError) {
        autoTrim = {
          status: "unavailable",
          path: "",
          silence_removed: 0,
          original_duration: 0,
          trimmed_duration: 0,
          note: trimError.message,
        };
      }
    }

    phaseStartedAt = nowMs();
    const transcriptResult = await runSttWorker({
      audioPath: scoringAudioRelativePath,
      language,
      modelName: whisperModel,
      device: whisperDevice,
      sttProvider,
      fastMode: true,
    });
    logAttemptTiming(attemptId, requestStartedAt, sttProvider === "both" ? "Whisper + Apple STT" : `${sttProvider} STT`, phaseStartedAt, timingBreakdown);
    writeTranscriptOutputs(transcriptPath, sttProvider, transcriptResult);

    let transcript = typeof transcriptResult === "string" ? transcriptResult.trim() : (transcriptResult?.transcript || "");
    let providerResults = null;
    let whisperStatus = sttProvider === "apple" ? "skipped" : (transcriptResult?.status || "ok");
    let whisperNote = transcriptResult?.error || "";
    let whisperRecovered = Boolean(transcriptResult?.recovered);
    let appleStatus = sttProvider === "apple" ? "ok" : "skipped";
    let appleNote = "";
    let whisperTranscript = sttProvider === "apple" ? "" : transcript;
    let appleTranscript = sttProvider === "apple" ? transcript : "";

    if (sttProvider === "both") {
      providerResults = transcriptResult;
      if (providerResults._timings) {
        console.log(`[timing] Whisper transcription: ${providerResults._timings.whisperMs}ms`);
        console.log(`[timing] Apple STT: ${providerResults._timings.appleMs}ms`);
        timingBreakdown.whisperTranscription = providerResults._timings.whisperMs;
        timingBreakdown.appleStt = providerResults._timings.appleMs;
      }
      whisperTranscript = providerResults.whisper.transcript || "";
      appleTranscript = providerResults.apple.transcript || "";
      whisperStatus = providerResults.whisper.status || "failed";
      whisperNote = providerResults.whisper.error || "";
      whisperRecovered = Boolean(providerResults.whisper.recovered);
      appleStatus = providerResults.apple.status || "failed";
      appleNote = providerResults.apple.error || "";
    }

    const checkedWhisper = applyTranscriptValidation("Whisper", whisperStatus, whisperTranscript, whisperNote);
    whisperStatus = checkedWhisper.status;
    whisperNote = checkedWhisper.note;
    const checkedApple = applyTranscriptValidation("Apple", appleStatus, appleTranscript, appleNote);
    appleStatus = checkedApple.status;
    appleNote = checkedApple.note;

    if (whisperStatus === "ok" || whisperStatus === "ok_retry") {
      transcript = whisperTranscript;
    } else if (appleStatus === "ok" || appleStatus === "ok_retry") {
      transcript = appleTranscript;
    } else {
      transcript = "";
    }

    let audioSimilarity = null;
    const modelAudioPath = path.join(ROOT, "model_audio", "target.mp3");
    if (fs.existsSync(modelAudioPath)) {
      try {
        phaseStartedAt = nowMs();
        const audioSimilarityResult = await runCommand(PYTHON, [
          "scripts/audio_similarity.py",
          "model_audio/target.mp3",
          scoringAudioRelativePath,
          "--target-word-count",
          String(countWords(targetText)),
          "--transcript-word-count",
          String(countWords(transcript)),
        ]);
        audioSimilarity = JSON.parse(audioSimilarityResult.stdout.trim());
        audioSimilarity.auto_trim = autoTrim;
        logAttemptTiming(attemptId, requestStartedAt, "fluency timing match", phaseStartedAt, timingBreakdown);
      } catch (audioError) {
        audioSimilarity = {
          status: "unavailable",
          note: audioError.message,
          pace_hint: "Fluency and timing match is unavailable for this attempt.",
          auto_trim: autoTrim,
        };
      }
    }

    let comparison = "";
    try {
      phaseStartedAt = nowMs();
      const compareArgs = [
        "scripts/compare.py",
        "--stt-provider",
        sttProvider,
        "--whisper-status",
        whisperStatus,
        "--whisper-note",
        whisperNote,
        "--apple-status",
        appleStatus,
        "--apple-note",
        appleNote,
        "--target-file",
        toRootRelative(targetPath),
        "--transcript-file",
        toRootRelative(transcriptPath),
        "--whisper-transcript-file",
        toRootRelative(runPaths.whisperTranscriptPath),
        "--apple-transcript-file",
        toRootRelative(runPaths.appleTranscriptPath),
        "--out-file",
        toRootRelative(comparisonPath),
      ];
      await runCommand(PYTHON, compareArgs);
      if (fs.existsSync(comparisonPath)) {
        comparison = fs.readFileSync(comparisonPath, "utf8");
      }
      logAttemptTiming(attemptId, requestStartedAt, "transcript comparison/scoring", phaseStartedAt, timingBreakdown);
    } catch (compareError) {
      comparison = `compare.py failed or is not compatible yet:\n${compareError.message}`;
    }
    timingBreakdown.total = Math.round(nowMs() - requestStartedAt);
    console.log(`[timing] total practice request: ${timingBreakdown.total}ms`);
    logAttempt(attemptId, `practice request completed in ${timingBreakdown.total}ms`);

    const providerTranscripts = providerResults
      ? {
          whisper: whisperStatus === "ok" || whisperStatus === "ok_retry" ? whisperTranscript : "",
          apple: appleStatus === "ok" || appleStatus === "ok_retry" ? appleTranscript : "",
        }
      : {
          whisper: sttProvider === "whisper" && (whisperStatus === "ok" || whisperStatus === "ok_retry") ? whisperTranscript : "",
          apple: sttProvider === "apple" && (appleStatus === "ok" || appleStatus === "ok_retry") ? appleTranscript : "",
        };
    const providerScores = providerResults
      ? {
          whisper: getValidProviderScore(comparison, "Whisper", whisperStatus),
          apple: getValidProviderScore(comparison, "Apple", appleStatus),
        }
      : {
          whisper: sttProvider === "whisper" ? getValidProviderScore(comparison, "Whisper", whisperStatus) : "--",
          apple: sttProvider === "apple" ? getValidProviderScore(comparison, "Apple Speech", appleStatus) : "--",
        };
    const focusWord = getFocusWord(targetText, getPrimaryTranscript({ whisperStatus, whisperTranscript, appleStatus, appleTranscript }));
    const teacherFeedback = buildTeacherFeedbackSummary(comparison, focusWord, audioSimilarity);
    const resultJson = buildCanonicalResult({
      root: ROOT,
      paths: runPaths,
      attemptId,
      createdAt,
      language,
      targetText,
      whisperModel,
      whisperDevice,
      sttProvider,
      whisperStatus,
      appleStatus,
      whisperNote,
      appleNote,
      providerTranscripts,
      providerScores,
      audioSimilarity,
      focusWord,
      teacherFeedback,
      timingBreakdown,
    });
    if (!fs.existsSync(autoTrimmedPath)) {
      resultJson.files.autoTrimmedWav = "";
    }
    fs.writeFileSync(resultJsonPath, `${JSON.stringify(resultJson, null, 2)}\n`, "utf8");

    res.json({
      ok: true,
      attemptId,
      createdAt,
      language,
      sttProvider,
      whisperModel,
      whisperDevice,
      targetText,
      transcript,
      transcripts: providerTranscripts,
      scores: providerScores,
      whisperStatus,
      whisperNote,
      whisperRecovered,
      appleStatus,
      appleNote,
      audioSimilarity,
      autoTrim,
      comparison,
      timingBreakdown,
      resultJson,
      resultJsonPath: toRootRelative(resultJsonPath),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  } finally {
    practiceRequestInProgress = false;
    if (uploadedPath) {
      fs.rmSync(uploadedPath, { force: true });
    }
  }
});

const server = app.listen(PORT, "127.0.0.1", () => {
  ensureDirs();
  console.log(`Backend running at http://localhost:${PORT}`);
  if (process.env.WHISPER_WARMUP === "1") {
    startSttWorker();
    console.log(`[STT] WHISPER_WARMUP=1; loading Whisper ${process.env.WHISPER_MODEL || DEFAULT_WHISPER_MODEL} in the worker.`);
  }
});

server.on("error", (error) => {
  console.error(`[ERROR] Backend failed to start: ${error.message}`);
  process.exit(1);
});

process.on("exit", () => {
  if (sttWorker && !sttWorker.killed) {
    sttWorker.kill();
  }
});
