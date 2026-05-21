import "./style.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:6174";

const languageEl = document.querySelector("#language");
const whisperModelEl = document.querySelector("#whisperModel");
const sttProviderEl = document.querySelector("#sttProvider");
const sttProviderHelpEl = document.querySelector("#sttProviderHelp");
const whisperDeviceEl = document.querySelector("#whisperDevice");
const whisperDeviceHelpEl = document.querySelector("#whisperDeviceHelp");
const targetTextEl = document.querySelector("#targetText");
const microphoneSelectEl = document.querySelector("#microphoneSelect");
const microphoneHelpEl = document.querySelector("#microphoneHelp");
const buildChunksBtn = document.querySelector("#buildChunksBtn");
const restoreFullSentenceBtn = document.querySelector("#restoreFullSentenceBtn");
const chunkListEl = document.querySelector("#chunkList");
const audioBtn = document.querySelector("#audioBtn");
const startBtn = document.querySelector("#startBtn");
const stopBtn = document.querySelector("#stopBtn");
const cancelSubmissionBtn = document.querySelector("#cancelSubmissionBtn");
const checkSelectedBtn = document.querySelector("#checkSelectedBtn");
const exportReportBtn = document.querySelector("#exportReportBtn");
const statusEl = document.querySelector("#status");
const practiceResultHeaderEl = document.querySelector("#practiceResultHeader");
const practiceResultContentEl = document.querySelector("#practiceResultContent");
const checkingProgressPanelEl = document.querySelector("#checkingProgressPanel");
const checkingProgressStepsEl = document.querySelector("#checkingProgressSteps");
const checkingElapsedEl = document.querySelector("#checkingElapsed");
const checkingProgressMessageEl = document.querySelector("#checkingProgressMessage");
const recordingMonitorEl = document.querySelector("#recordingMonitor");
const liveWaveformEl = document.querySelector("#liveWaveform");
const targetAudioEl = document.querySelector("#targetAudio");
const targetWaveformEl = document.querySelector("#targetWaveform");
const wordPracticeAudioEl = document.querySelector("#wordPracticeAudio");
const speedButtons = document.querySelectorAll(".speed-button");
const attemptsListEl = document.querySelector("#attemptsList");
const attemptHelperEl = document.querySelector("#attemptHelper");
const attemptCountEl = document.querySelector("#attemptCount");
const compareFirstEl = document.querySelector("#compareFirst");
const compareSecondEl = document.querySelector("#compareSecond");
const comparisonViewEl = document.querySelector("#comparisonView");
const historyListEl = document.querySelector("#historyList");
const showAllHistoryBtn = document.querySelector("#showAllHistoryBtn");
const clearLocalDataBtn = document.querySelector("#clearLocalDataBtn");
const overallScoreEl = document.querySelector("#overallScore");
const fluencyScoreSummaryEl = document.querySelector("#fluencyScoreSummary");
const focusWordResultEl = document.querySelector("#focusWordResult");
const teacherFeedbackResultEl = document.querySelector("#teacherFeedbackResult");
const targetResultEl = document.querySelector("#targetResult");
const transcriptResultEl = document.querySelector("#transcriptResult");
const appleTranscriptCardEl = document.querySelector("#appleTranscriptCard");
const appleTranscriptResultEl = document.querySelector("#appleTranscriptResult");
const nativeTranscriptLabelEl = document.querySelector("#nativeTranscriptLabel");
const wordComparisonResultEl = document.querySelector("#wordComparisonResult");
const wordPracticeHelpEl = document.querySelector("#wordPracticeHelp");
const wordPracticeListEl = document.querySelector("#wordPracticeList");
const languageTipResultEl = document.querySelector("#languageTipResult");
const fluencyResultEl = document.querySelector("#fluencyResult");
const timingMatchEl = document.querySelector("#timingMatch");
const rhythmMatchEl = document.querySelector("#rhythmMatch");
const acousticSimilarityEl = document.querySelector("#acousticSimilarity");
const modelDurationEl = document.querySelector("#modelDuration");
const userDurationEl = document.querySelector("#userDuration");
const speedRatioEl = document.querySelector("#speedRatio");
const mainFluencyIssueEl = document.querySelector("#mainFluencyIssue");
const silenceRemovedEl = document.querySelector("#silenceRemoved");
const exactRatioEl = document.querySelector("#exactRatio");
const partialRatioEl = document.querySelector("#partialRatio");
const tokenSortRatioEl = document.querySelector("#tokenSortRatio");
const comparisonResultEl = document.querySelector("#comparisonResult");

let mediaRecorder = null;
let recordedChunks = [];
let recordingAttempts = [];
let selectedAttemptId = null;
let nextAttemptId = 1;
let submitAbortController = null;
let liveAudioSource = null;
let liveAnalyser = null;
let liveWaveformFrame = null;
let isRecording = false;
let isSubmitting = false;
let fullSentenceText = "";
let displayedResult = null;
let showAllHistory = false;
let progressStartedAt = 0;
let progressTimer = null;
let progressStageTimer = null;
let progressSteps = [];
let platformConfig = {
  platform: "unknown",
  nativeProvider: "",
  nativeProviderLabel: "Native STT",
  defaultSttProvider: "whisper",
};
const MAX_ATTEMPTS = 10;
const HISTORY_STORAGE_KEY = "whisperSpeakingPracticeHistory";
const ATTEMPT_DB_NAME = "whisperSpeakingPracticeAttempts";
const ATTEMPT_DB_VERSION = 1;
const ATTEMPT_STORE_NAME = "attempts";
const audioBufferCache = new Map();
let sharedAudioContext = null;

const LANGUAGE_TIPS = {
  en: "Focus on clear word endings and natural stress. If Whisper misses small words, slow down slightly.",
  de: "Keep consonant endings crisp and watch long compound words. Practice in short chunks before the full sentence.",
  nl: "Pay attention to vowel length and the g/ch sound. Slow model playback can help you match rhythm.",
  pl: "Keep consonant clusters steady and avoid dropping final sounds. Practice difficult clusters separately.",
  ru: "Watch word stress and unstressed vowels. Repeat shorter phrase groups before checking the full sentence.",
  ja: "Keep syllable timing even and avoid adding extra stress. Shadow the model audio at normal speed.",
  vi: "Tone clarity matters. Practice slowly first, then repeat with the same tone contour as the model.",
  zh: "Focus on tones and syllable boundaries. Use shorter chunks if the sentence is long.",
};

const BENCHMARK_TARGETS = {
  en: "Today I will practice speaking clearly, slowly, and with natural rhythm.",
  de: "Heute übe ich deutliches Sprechen, langsames Tempo und natürlichen Rhythmus.",
  nl: "Vandaag oefen ik duidelijk spreken, rustig tempo en natuurlijk ritme.",
  pl: "Dzisiaj ćwiczę wyraźną wymowę, spokojne tempo i naturalny rytm.",
  ru: "Сегодня я тренирую четкую речь, спокойный темп и естественный ритм.",
  ja: "今日は、はっきり、ゆっくり、自然なリズムで話す練習をします。",
  vi: "Hôm nay tôi luyện nói rõ ràng, chậm rãi và có nhịp điệu tự nhiên.",
  zh: "今天我要练习说得清楚、慢一点，并保持自然的节奏。",
};

const CHECKING_STEP_DEFINITIONS = [
  { id: "prepare", label: "Preparing audio" },
  { id: "trim", label: "Auto-trimming silence" },
  { id: "convert", label: "Converting to 16 kHz mono WAV" },
  { id: "whisper", label: "Running Whisper Large" },
  { id: "native", label: "Running Native STT" },
  { id: "compare", label: "Comparing transcripts" },
  { id: "fluency", label: "Computing Fluency & Timing Match" },
  { id: "feedback", label: "Generating Teacher Feedback" },
  { id: "history", label: "Saving practice history" },
];

function getNativeProviderLabel(provider = platformConfig.nativeProvider) {
  if (provider === "apple") {
    return "Apple";
  }
  if (provider === "windows_speech") {
    return "Windows Speech";
  }
  return platformConfig.nativeProviderLabel || "Native STT";
}

function getNativeProviderKey(result = {}) {
  return result.nativeProvider || platformConfig.nativeProvider || "";
}

function getNativeStatus(result = {}) {
  const nativeProvider = getNativeProviderKey(result);
  if (nativeProvider === "apple") {
    return result.appleStatus || "skipped";
  }
  if (nativeProvider === "windows_speech") {
    return result.windowsSpeechStatus || "skipped";
  }
  return "skipped";
}

function getNativeNote(result = {}) {
  const nativeProvider = getNativeProviderKey(result);
  return nativeProvider === "windows_speech" ? result.windowsSpeechNote || "" : result.appleNote || "";
}

function getNativeTranscript(result = {}) {
  const nativeProvider = getNativeProviderKey(result);
  if (!nativeProvider) {
    return "";
  }
  if (nativeProvider === "windows_speech") {
    return result.bothTranscripts?.windows_speech || (result.sttProvider === "windows_speech" ? result.transcript : "") || "";
  }
  return result.bothTranscripts?.apple || (result.sttProvider === "apple" ? result.transcript : "") || "";
}

function getNativeScore(result = {}) {
  const nativeProvider = getNativeProviderKey(result);
  if (nativeProvider === "windows_speech") {
    return result.bothScores?.windows_speech || "--";
  }
  return result.bothScores?.apple || "--";
}

function isBenchmarkTarget(text) {
  const normalizedText = text.trim();
  return Object.values(BENCHMARK_TARGETS).some((target) => target === normalizedText);
}

function setBenchmarkTargetForLanguage({ force = false } = {}) {
  const benchmarkText = BENCHMARK_TARGETS[languageEl.value] || BENCHMARK_TARGETS.en;

  if (!force && targetTextEl.value.trim() && !isBenchmarkTarget(targetTextEl.value)) {
    return false;
  }

  targetTextEl.value = benchmarkText;
  fullSentenceText = "";
  renderChunks([]);
  resetResults();
  clearTargetAudio();
  return true;
}

async function loadPlatformSettings() {
  try {
    const response = await fetch(`${API_BASE}/api/bootstrap`);
    if (!response.ok) {
      throw new Error("bootstrap unavailable");
    }
    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || "bootstrap failed");
    }

    platformConfig = {
      platform: data.platform || "unknown",
      nativeProvider: data.nativeProvider || "",
      nativeProviderLabel: getNativeProviderLabel(data.nativeProvider || ""),
      defaultSttProvider: data.defaultSttProvider || "whisper",
    };

    if (Array.isArray(data.sttProviders)) {
      sttProviderEl.innerHTML = data.sttProviders
        .map((provider) => `<option value="${provider.value}">${provider.label}</option>`)
        .join("");
      sttProviderEl.value = data.defaultSttProvider || "whisper";
    }

    if (Array.isArray(data.whisperDevices)) {
      whisperDeviceEl.innerHTML = data.whisperDevices
        .map((device) => `<option value="${device.value}">${device.label}</option>`)
        .join("");
      whisperDeviceEl.value = data.defaultWhisperDevice || "auto";
    }

    sttProviderHelpEl.textContent = platformConfig.nativeProvider
      ? `Whisper is default. ${platformConfig.nativeProviderLabel} is experimental and platform-native.`
      : "Whisper is default. No native comparison provider is available on this platform.";
    whisperDeviceHelpEl.textContent = platformConfig.platform === "darwin"
      ? "Auto uses MPS on Apple Silicon when available, otherwise CPU."
      : "Auto uses CUDA when available, otherwise CPU. MPS is never selected outside macOS.";
  } catch (_error) {
    sttProviderEl.value = "whisper";
    sttProviderHelpEl.textContent = "Whisper is default. Platform settings could not be loaded.";
  }
}

function setStatus(message) {
  statusEl.textContent = message;
}

function renderCheckingProgress() {
  checkingProgressStepsEl.innerHTML = progressSteps
    .map((step) => `
      <li class="checking-step ${step.status}" data-step-id="${step.id}">
        <span class="checking-step-dot">${getProgressStepIcon(step.status)}</span>
        <div>
          <strong>${step.label}</strong>
          <small>${step.note || step.status}</small>
        </div>
      </li>
    `)
    .join("");
}

function getProgressStepIcon(status) {
  if (status === "done") {
    return "✓";
  }
  if (status === "processing") {
    return "⏳";
  }
  if (status === "failed") {
    return "!";
  }
  if (status === "skipped") {
    return "-";
  }
  return "";
}

function showCheckingProgressPanel() {
  practiceResultHeaderEl.hidden = true;
  practiceResultContentEl.hidden = true;
  checkingProgressPanelEl.hidden = false;
}

function showPracticeResultContent() {
  checkingProgressPanelEl.hidden = true;
  practiceResultHeaderEl.hidden = false;
  practiceResultContentEl.hidden = false;
}

function setProgressStep(stepId, status, note = "") {
  const step = progressSteps.find((item) => item.id === stepId);
  if (!step) {
    return;
  }

  step.status = status;
  step.note = note || status;
  renderCheckingProgress();
}

function markPreviousProgressDone(activeStepId) {
  for (const step of progressSteps) {
    if (step.id === activeStepId) {
      break;
    }
    if (step.status === "waiting" || step.status === "processing") {
      step.status = "done";
      step.note = "done";
    }
  }
}

function stopProgressTimers() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
  if (progressStageTimer) {
    clearTimeout(progressStageTimer);
    progressStageTimer = null;
  }
}

function startCheckingProgress(sttProvider) {
  stopProgressTimers();
  const nativeEnabled = sttProvider === platformConfig.nativeProvider || sttProvider === "both";
  progressSteps = CHECKING_STEP_DEFINITIONS.map((step) => ({
    ...step,
    label: step.id === "native" ? `Running ${getNativeProviderLabel()} STT` : step.label,
    status: step.id === "native" && !nativeEnabled ? "skipped" : "waiting",
    note: step.id === "native" && !nativeEnabled ? "skipped" : "waiting",
  }));
  progressStartedAt = performance.now();
  checkingElapsedEl.textContent = "0.0s";
  checkingProgressMessageEl.textContent = "Preparing your recording for STT scoring.";
  showCheckingProgressPanel();
  renderCheckingProgress();

  progressTimer = setInterval(() => {
    checkingElapsedEl.textContent = `${((performance.now() - progressStartedAt) / 1000).toFixed(1)}s`;
  }, 100);

  const stagedSteps = progressSteps.filter((step) => step.status !== "skipped");
  let index = 0;
  const advance = () => {
    if (index >= stagedSteps.length) {
      return;
    }
    const step = stagedSteps[index];
    markPreviousProgressDone(step.id);
    setProgressStep(step.id, "processing", "processing");
    checkingProgressMessageEl.textContent = step.label;
    index += 1;
    const delay = step.id === "whisper" || step.id === "native" ? 2200 : 700;
    progressStageTimer = setTimeout(advance, delay);
  };

  advance();
}

function finishCheckingProgress(data) {
  stopProgressTimers();
  const whisperStep = progressSteps.find((step) => step.id === "whisper");
  const nativeStep = progressSteps.find((step) => step.id === "native");
  const nativeStatus = getNativeStatus(data);
  const nativeLabel = getNativeProviderLabel(data?.nativeProvider);

  for (const step of progressSteps) {
    if (step.status === "processing" || step.status === "waiting") {
      step.status = "done";
      step.note = "done";
    }
  }

  if (whisperStep && data?.whisperStatus === "ok_retry") {
    whisperStep.status = "done";
    whisperStep.note = "Whisper first attempt was invalid; recovered after retry.";
  } else if (whisperStep && data?.whisperStatus === "invalid") {
    whisperStep.status = "failed";
    whisperStep.note = "Whisper unavailable.";
  }

  if (nativeStep && data?.sttProvider === "both" && nativeStatus && !isProviderUsable(nativeStatus) && nativeStatus !== "skipped") {
    nativeStep.status = "failed";
    nativeStep.note = `${nativeLabel} STT unavailable. Continuing with Whisper result.`;
    checkingProgressMessageEl.textContent = `${nativeLabel} STT unavailable. Continuing with Whisper result.`;
  } else if (data?.whisperStatus === "ok_retry") {
    checkingProgressMessageEl.textContent = "Whisper recovered after retry. Showing your result.";
  } else {
    checkingProgressMessageEl.textContent = "Check complete. Showing your result.";
  }

  checkingElapsedEl.textContent = `${((performance.now() - progressStartedAt) / 1000).toFixed(1)}s`;
  renderCheckingProgress();
}

function hideCheckingProgress() {
  stopProgressTimers();
  showPracticeResultContent();
}

function failCheckingProgress(message, whisperFailed = false) {
  stopProgressTimers();
  const activeStep = progressSteps.find((step) => step.status === "processing");
  if (activeStep) {
    activeStep.status = "failed";
    activeStep.note = message;
  }
  if (whisperFailed) {
    setProgressStep("whisper", "failed", message);
  }
  checkingProgressMessageEl.textContent = message;
  renderCheckingProgress();
}

function clearTargetAudio() {
  targetAudioEl.pause();
  targetAudioEl.removeAttribute("src");
  targetAudioEl.load();
  targetAudioEl.hidden = true;
  targetWaveformEl.hidden = true;
}

function clearWordPracticeAudio() {
  wordPracticeAudioEl.pause();
  wordPracticeAudioEl.removeAttribute("src");
  wordPracticeAudioEl.load();
  wordPracticeAudioEl.hidden = true;
}

function getAudioContext() {
  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContext();
  }

  return sharedAudioContext;
}

async function loadMicrophones() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    microphoneSelectEl.disabled = true;
    microphoneHelpEl.textContent = "Microphone selection is not supported in this browser.";
    return;
  }

  try {
    const currentValue = microphoneSelectEl.value;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const microphones = devices.filter((device) => device.kind === "audioinput");

    microphoneSelectEl.innerHTML = '<option value="">Default microphone</option>';

    microphones.forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || `Microphone ${index + 1}`;
      microphoneSelectEl.appendChild(option);
    });

    if ([...microphoneSelectEl.options].some((option) => option.value === currentValue)) {
      microphoneSelectEl.value = currentValue;
    }

    microphoneHelpEl.textContent = microphones.some((device) => device.label)
      ? "Choose the microphone you want to use for recording."
      : "Allow microphone access once to show device names.";
  } catch (_error) {
    microphoneSelectEl.disabled = true;
    microphoneHelpEl.textContent = "Could not load microphone list.";
  }
}

function getRecordingAudioConstraints() {
  return microphoneSelectEl.value
    ? { deviceId: { exact: microphoneSelectEl.value } }
    : true;
}

async function decodeAudioBlob(blob) {
  const audioContext = getAudioContext();
  const buffer = await blob.arrayBuffer();
  return audioContext.decodeAudioData(buffer);
}

async function getAttemptAudioBuffer(attempt) {
  if (!audioBufferCache.has(attempt.id)) {
    audioBufferCache.set(attempt.id, decodeAudioBlob(attempt.blob));
  }

  return audioBufferCache.get(attempt.id);
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0.00s";
  }

  return `${seconds.toFixed(2)}s`;
}

function getMicrophoneErrorMessage(error) {
  if (error.name === "NotAllowedError" || error.name === "SecurityError") {
    return "Microphone permission was denied. Allow microphone access for this site in your browser and macOS System Settings, then reload the page.";
  }

  if (error.name === "NotFoundError") {
    return "No microphone was found. Connect or enable a microphone, then try again.";
  }

  if (error.name === "NotReadableError") {
    return "The microphone is busy or unavailable. Close other apps using it, then try again.";
  }

  return `Microphone error: ${error.message}`;
}

function getTargetText() {
  return targetTextEl.value.trim();
}

function openAttemptDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }

    const request = indexedDB.open(ATTEMPT_DB_NAME, ATTEMPT_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ATTEMPT_STORE_NAME)) {
        db.createObjectStore(ATTEMPT_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runAttemptStore(mode, callback) {
  return openAttemptDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(ATTEMPT_STORE_NAME, mode);
        const store = transaction.objectStore(ATTEMPT_STORE_NAME);
        const request = callback(store);

        transaction.oncomplete = () => {
          db.close();
          resolve(request?.result);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      }),
  );
}

function saveAttemptToDb(attempt) {
  return runAttemptStore("readwrite", (store) =>
    store.put({
      id: attempt.id,
      blob: attempt.blob,
      result: attempt.result || null,
      createdAt: attempt.createdAt,
      duration: attempt.duration || null,
      trimStart: attempt.trimStart || 0,
      trimEnd: attempt.trimEnd || null,
      manualTrimmed: Boolean(attempt.manualTrimmed),
    }),
  ).catch(() => {
    setStatus("Recording is saved for this session, but browser persistence failed.");
  });
}

function deleteAttemptFromDb(attemptId) {
  return runAttemptStore("readwrite", (store) => store.delete(attemptId)).catch(() => {});
}

function clearAttemptsFromDb() {
  return runAttemptStore("readwrite", (store) => store.clear()).catch(() => {});
}

async function loadAttemptsFromDb() {
  try {
    const savedAttempts = await runAttemptStore("readonly", (store) => store.getAll());
    recordingAttempts = (savedAttempts || [])
      .sort((left, right) => left.id - right.id)
      .slice(-MAX_ATTEMPTS)
      .map((attempt) => ({
        id: attempt.id,
        blob: attempt.blob,
        result: attempt.result || null,
        createdAt: attempt.createdAt || new Date().toISOString(),
        duration: attempt.duration || null,
        trimStart: attempt.trimStart || 0,
        trimEnd: attempt.trimEnd || null,
        manualTrimmed: Boolean(attempt.manualTrimmed),
        url: URL.createObjectURL(attempt.blob),
      }));
    nextAttemptId = recordingAttempts.reduce((maxId, attempt) => Math.max(maxId, attempt.id), 0) + 1;
    selectedAttemptId = recordingAttempts.at(-1)?.id || null;
  } catch (_error) {
    recordingAttempts = [];
    nextAttemptId = 1;
  }

  renderAttempts();
  renderComparisonControls();
}

function getPracticeHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
  } catch (_error) {
    return [];
  }
}

function splitIntoChunks(text) {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const punctuationParts = normalizedText
    .split(/(?<=[.!?。！？;；,，、:：])\s*/u)
    .map((part) => part.trim())
    .filter(Boolean);

  if (punctuationParts.length > 1 && punctuationParts.every((part) => part.length <= 90)) {
    return punctuationParts;
  }

  const clauseParts = normalizedText
    .split(/\b(and|but|or|because|when|while|that|which|who|und|aber|oder|weil|wenn|dat|omdat|en|maar|và|nhưng|khi|rằng)\b/iu)
    .reduce((chunks, part, index, parts) => {
      if (!part.trim()) {
        return chunks;
      }

      if (index % 2 === 1 && chunks.length > 0) {
        chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${part.trim()}`;
        return chunks;
      }

      chunks.push(part.trim());
      return chunks;
    }, [])
    .filter(Boolean);

  if (clauseParts.length > 1 && clauseParts.every((part) => part.split(/\s+/).length <= 10)) {
    return clauseParts;
  }

  const words = normalizedText.split(/\s+/).filter(Boolean);
  if (words.length <= 8) {
    return normalizedText ? [normalizedText] : [];
  }

  const chunks = [];
  let current = [];

  for (const word of words) {
    current.push(word);
    if (current.length >= 6 && /[,，;；:]?$/.test(word)) {
      chunks.push(current.join(" "));
      current = [];
    } else if (current.length >= 8) {
      chunks.push(current.join(" "));
      current = [];
    }
  }

  if (current.length > 0) {
    chunks.push(current.join(" "));
  }

  return chunks;
}

function renderChunks(chunks) {
  if (chunks.length === 0) {
    chunkListEl.innerHTML = "";
    restoreFullSentenceBtn.disabled = true;
    return;
  }

  chunkListEl.innerHTML = chunks
    .map((chunk, index) => `
      <button type="button" class="chunk-button" data-chunk-index="${index}">
        <span>Chunk ${index + 1}</span>
        ${chunk}
      </button>
    `)
    .join("");
  restoreFullSentenceBtn.disabled = false;
}

function getSelectedAttempt() {
  return recordingAttempts.find((attempt) => attempt.id === selectedAttemptId) || null;
}

function getSelectedAttemptNumber() {
  const index = recordingAttempts.findIndex((attempt) => attempt.id === selectedAttemptId);
  return index >= 0 ? index + 1 : null;
}

function getScoreLabel(scoreValue) {
  if (scoreValue >= 95) {
    return "Excellent";
  }

  if (scoreValue >= 85) {
    return "Good";
  }

  if (scoreValue >= 70) {
    return "Understandable";
  }

  if (Number.isFinite(scoreValue)) {
    return "Needs practice";
  }

  return "Not checked";
}

function getScoreValue(scoreText) {
  const scoreValue = Number.parseFloat(scoreText);
  return Number.isFinite(scoreValue) ? scoreValue : null;
}

function buildFluencyAnalysis(transcript, durationSeconds) {
  const words = tokenizeWords(transcript);

  if (!durationSeconds || durationSeconds <= 0) {
    return {
      durationSeconds: null,
      wordsPerMinute: null,
      hint: "Fluency timing is available for newly checked recording attempts.",
    };
  }

  const wordsPerMinute = words.length > 0 ? Math.round((words.length / durationSeconds) * 60) : 0;
  const hints = [`Duration: ${formatDuration(durationSeconds)}.`, `Pace: ${wordsPerMinute} words/min.`];

  if (words.length === 0) {
    hints.push("No transcript words were detected, so try speaking closer to the microphone.");
  } else if (durationSeconds < 1.5) {
    hints.push("This recording is very short; record at least 2–3 seconds for a fair check.");
  } else if (wordsPerMinute < 75) {
    hints.push("Your pace is slow. That is fine for practice, then gradually connect the phrase more smoothly.");
  } else if (wordsPerMinute > 180) {
    hints.push("Your pace is fast. Slow down slightly so word endings stay clear.");
  } else {
    hints.push("Your pace is in a comfortable practice range.");
  }

  return {
    durationSeconds,
    wordsPerMinute,
    hint: hints.join(" "),
  };
}

function formatScoreNumber(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}/100` : "--";
}

function isValidScoreText(scoreText) {
  return /[0-9.]+\/100/.test(String(scoreText || ""));
}

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

function isProviderUsable(status) {
  return status === "ok" || status === "ok_retry";
}

function normalizeTranscriptText(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[\n\r]+/gu, " ")
    .replace(/[^\p{L}\p{N}_\s]/gu, "")
    .replace(/\s+/gu, " ");
}

function validateTranscriptText(transcript) {
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

function normalizeProviderStatus(status, transcript, note = "") {
  if (status && !isProviderUsable(status)) {
    return { status, note };
  }

  const validation = validateTranscriptText(transcript);
  if (validation.status !== "ok") {
    return { status: "invalid", note: note || validation.reason };
  }

  return { status: status || "ok", note };
}

function getProviderDisplayScore(providerName, scoreText, transcript, status = "ok") {
  if (status === "invalid") {
    return `${providerName} invalid transcript`;
  }

  if (status && !isProviderUsable(status)) {
    return status === "skipped" ? `${providerName} skipped` : `${providerName} unavailable`;
  }

  if (!String(transcript || "").trim()) {
    return `${providerName} unavailable`;
  }

  return isValidScoreText(scoreText) ? scoreText : "--";
}

function getWordAccuracySummary(result) {
  if (result.bothScores) {
    const whisperTranscript = result.bothTranscripts?.whisper || "";
    const nativeTranscript = getNativeTranscript(result);
    const nativeLabel = getNativeProviderLabel(getNativeProviderKey(result));
    const whisperScore = getProviderDisplayScore("Whisper", result.bothScores.whisper, whisperTranscript, result.whisperStatus || "ok");
    const nativeScore = getProviderDisplayScore(nativeLabel, getNativeScore(result), nativeTranscript, getNativeStatus(result));
    return `Whisper ${whisperScore.replace(/^Whisper /, "")} · ${nativeLabel} ${nativeScore.replace(new RegExp(`^${nativeLabel} `), "")}`;
  }

  const isNativeOnly = result.sttProvider === "apple" || result.sttProvider === "windows_speech";
  const providerName = isNativeOnly ? getNativeProviderLabel(result.sttProvider) : "Whisper";
  const providerStatus = isNativeOnly ? getNativeStatus({ ...result, nativeProvider: result.sttProvider }) : result.whisperStatus || "ok";
  const score = getProviderDisplayScore(providerName, result.overallScore, result.transcript, providerStatus);
  return score.includes("unavailable") || score.includes("invalid transcript") || score.includes("skipped")
    ? score
    : `${score} · ${result.scoreLabel}`;
}

function getFluencyTimingScore(audioSimilarity) {
  if (audioSimilarity?.status !== "ok") {
    return "--";
  }

  const timing = Number(audioSimilarity.timing_match);
  const rhythm = Number(audioSimilarity.rhythm_match);
  if (!Number.isFinite(timing) || !Number.isFinite(rhythm)) {
    return "--";
  }

  return formatScoreNumber((timing + rhythm) / 2);
}

function getWordAccuracyValue(result) {
  if (result.bothScores?.whisper && isProviderUsable(result.whisperStatus)) {
    return getScoreValue(result.bothScores.whisper);
  }
  if (result.bothScores?.apple && isProviderUsable(result.appleStatus)) {
    return getScoreValue(result.bothScores.apple);
  }
  if (result.bothScores?.windows_speech && isProviderUsable(result.windowsSpeechStatus)) {
    return getScoreValue(result.bothScores.windows_speech);
  }
  return getScoreValue(result.overallScore);
}

function getFluencyTimingValue(result) {
  const audioSimilarity = result.audioSimilarity || null;
  if (audioSimilarity?.status !== "ok") {
    return null;
  }
  const timing = Number(audioSimilarity.timing_match);
  const rhythm = Number(audioSimilarity.rhythm_match);
  return Number.isFinite(timing) && Number.isFinite(rhythm) ? (timing + rhythm) / 2 : null;
}

function formatScoreDelta(value) {
  if (!Number.isFinite(value)) {
    return "no comparable score";
  }
  if (Math.abs(value) < 0.1) {
    return "no change";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} points`;
}

function formatSecondsValue(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)}s` : "--";
}

function formatSpeedRatio(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? `${Number(value).toFixed(2)}x` : "--";
}

function getFluencyExplanation(audioSimilarity) {
  if (audioSimilarity?.status !== "ok") {
    return audioSimilarity?.pace_hint || "Fluency timing is available for checked recording attempts.";
  }

  const parts = [
    `Model duration: ${formatSecondsValue(audioSimilarity.model_duration)}.`,
    `Your duration: ${formatSecondsValue(audioSimilarity.user_duration)}.`,
    `Speed ratio: ${formatSpeedRatio(audioSimilarity.speed_ratio)}.`,
  ];

  const silenceRemoved = Number(audioSimilarity.auto_trim?.silence_removed ?? audioSimilarity.user_silence_removed);
  if (silenceRemoved > 0) {
    parts.push(`Auto-trim removed ${formatSecondsValue(silenceRemoved)} of leading/trailing silence.`);
  } else if (audioSimilarity.auto_trim?.status === "manual_override") {
    parts.push("Manual trim was used, so auto-trim did not change this attempt.");
  }

  if (audioSimilarity.main_issue && audioSimilarity.main_issue !== "none") {
    parts.push(`Main issue: ${audioSimilarity.main_issue}.`);
  } else {
    parts.push("Main issue: timing is close enough for this attempt.");
  }

  parts.push(audioSimilarity.pace_hint);
  return parts.join(" ");
}

function getResultFocusPractice(result) {
  const primaryTranscript = getPrimaryValidTranscript(result);
  return result.focusPractice || getFocusPractice(result.targetText || "", primaryTranscript, {
    whisperTranscript: isProviderUsable(result.whisperStatus) ? result.bothTranscripts?.whisper || result.transcript || "" : "",
    whisperStatus: result.whisperStatus,
    appleTranscript: isProviderUsable(result.appleStatus) ? result.bothTranscripts?.apple || (result.sttProvider === "apple" ? result.transcript : "") || "" : "",
    appleStatus: result.appleStatus,
    windowsSpeechTranscript: isProviderUsable(result.windowsSpeechStatus) ? result.bothTranscripts?.windows_speech || (result.sttProvider === "windows_speech" ? result.transcript : "") || "" : "",
    windowsSpeechStatus: result.windowsSpeechStatus,
    nativeProvider: getNativeProviderKey(result),
    nativeProviderLabel: getNativeProviderLabel(getNativeProviderKey(result)),
  });
}

function getPrimaryValidTranscript(result) {
  if (isProviderUsable(result.whisperStatus)) {
    return result.bothTranscripts?.whisper || result.transcript || "";
  }
  if (isProviderUsable(result.appleStatus)) {
    return result.bothTranscripts?.apple || result.transcript || "";
  }
  if (isProviderUsable(result.windowsSpeechStatus)) {
    return result.bothTranscripts?.windows_speech || result.transcript || "";
  }
  return "";
}

function savePracticeHistory(result) {
  try {
    const existing = getPracticeHistory();
    const historyItem = {
      ...result,
      attemptId: result.attemptId || result.resultJson?.attemptId || "",
      resultJsonPath: result.resultJsonPath || result.resultJson?.files?.resultJson || "",
      historySummary: {
        attemptId: result.attemptId || result.resultJson?.attemptId || "",
        checkedAt: result.checkedAt,
        language: result.language,
        targetText: result.targetText,
        wordAccuracy: getWordAccuracySummary(result),
        fluencyTiming: getFluencyTimingScore(result.audioSimilarity),
        whisperStatus: result.whisperStatus,
        appleStatus: result.appleStatus,
        windowsSpeechStatus: result.windowsSpeechStatus,
        nativeProvider: getNativeProviderKey(result),
      },
    };
    const next = [historyItem, ...existing].slice(0, 50);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
    renderPracticeHistory();
  } catch (_error) {
    // History is a convenience feature; the core practice flow should continue without it.
  }
}

function tokenizeWords(text) {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).map((word) => word.trim()).filter(Boolean);
}

function getEditDistance(left, right) {
  const table = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));

  for (let index = 0; index <= left.length; index += 1) {
    table[index][0] = index;
  }

  for (let index = 0; index <= right.length; index += 1) {
    table[0][index] = index;
  }

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      table[leftIndex][rightIndex] = Math.min(
        table[leftIndex - 1][rightIndex] + 1,
        table[leftIndex][rightIndex - 1] + 1,
        table[leftIndex - 1][rightIndex - 1] + cost,
      );
    }
  }

  return table[left.length][right.length];
}

function getWordSimilarity(left, right) {
  const longest = Math.max(left.length, right.length);
  if (longest === 0) {
    return 1;
  }

  return 1 - getEditDistance(left, right) / longest;
}

function isCloseWord(left, right) {
  if (!left || !right) {
    return false;
  }

  if (left[0] === right[0] && getWordSimilarity(left, right) >= 0.58) {
    return true;
  }

  return getWordSimilarity(left, right) >= 0.72;
}

function getWordDiff(targetText, transcriptText) {
  const targetWords = tokenizeWords(targetText);
  const transcriptWords = tokenizeWords(transcriptText);
  const table = Array.from({ length: targetWords.length + 1 }, () => Array(transcriptWords.length + 1).fill(0));

  for (let targetIndex = targetWords.length - 1; targetIndex >= 0; targetIndex -= 1) {
    for (let transcriptIndex = transcriptWords.length - 1; transcriptIndex >= 0; transcriptIndex -= 1) {
      if (targetWords[targetIndex] === transcriptWords[transcriptIndex]) {
        table[targetIndex][transcriptIndex] = table[targetIndex + 1][transcriptIndex + 1] + 1;
      } else {
        table[targetIndex][transcriptIndex] = Math.max(
          table[targetIndex + 1][transcriptIndex],
          table[targetIndex][transcriptIndex + 1],
        );
      }
    }
  }

  const targetTokens = [];
  const transcriptTokens = [];
  let targetIndex = 0;
  let transcriptIndex = 0;

  while (targetIndex < targetWords.length && transcriptIndex < transcriptWords.length) {
    if (targetWords[targetIndex] === transcriptWords[transcriptIndex]) {
      targetTokens.push({ text: targetWords[targetIndex], status: "match" });
      transcriptTokens.push({ text: transcriptWords[transcriptIndex], status: "match" });
      targetIndex += 1;
      transcriptIndex += 1;
    } else if (table[targetIndex + 1][transcriptIndex] >= table[targetIndex][transcriptIndex + 1]) {
      if (isCloseWord(targetWords[targetIndex], transcriptWords[transcriptIndex])) {
        targetTokens.push({ text: targetWords[targetIndex], status: "close", pairedWith: transcriptWords[transcriptIndex] });
        transcriptTokens.push({ text: transcriptWords[transcriptIndex], status: "close", pairedWith: targetWords[targetIndex] });
        targetIndex += 1;
        transcriptIndex += 1;
      } else {
        targetTokens.push({ text: targetWords[targetIndex], status: "missing" });
        targetIndex += 1;
      }
    } else {
      if (isCloseWord(targetWords[targetIndex], transcriptWords[transcriptIndex])) {
        targetTokens.push({ text: targetWords[targetIndex], status: "close", pairedWith: transcriptWords[transcriptIndex] });
        transcriptTokens.push({ text: transcriptWords[transcriptIndex], status: "close", pairedWith: targetWords[targetIndex] });
        targetIndex += 1;
        transcriptIndex += 1;
      } else {
        transcriptTokens.push({ text: transcriptWords[transcriptIndex], status: "extra" });
        transcriptIndex += 1;
      }
    }
  }

  while (targetIndex < targetWords.length) {
    targetTokens.push({ text: targetWords[targetIndex], status: "missing" });
    targetIndex += 1;
  }

  while (transcriptIndex < transcriptWords.length) {
    transcriptTokens.push({ text: transcriptWords[transcriptIndex], status: "extra" });
    transcriptIndex += 1;
  }

  return { targetTokens, transcriptTokens };
}

function renderTokenRow(label, tokens) {
  const row = document.createElement("div");
  row.className = "word-row";

  const title = document.createElement("strong");
  title.textContent = label;
  row.appendChild(title);

  const tokenList = document.createElement("div");
  tokenList.className = "word-token-list";

  if (tokens.length === 0) {
    const empty = document.createElement("span");
    empty.className = "word-token empty";
    empty.textContent = "No words detected";
    tokenList.appendChild(empty);
  }

  for (const token of tokens) {
    const pill = document.createElement("span");
    pill.className = `word-token ${token.status}`;
    pill.textContent = token.text;
    if (token.pairedWith) {
      pill.title = `Close match: ${token.pairedWith}`;
    }
    tokenList.appendChild(pill);
  }

  row.appendChild(tokenList);
  return row;
}

function getWordPracticeTokens(targetText, transcriptText) {
  const { targetTokens } = getWordDiff(targetText, transcriptText);
  const seen = new Set();

  return targetTokens.filter((token) => {
    if (token.status === "match" || token.status === "empty" || seen.has(token.text)) {
      return false;
    }

    seen.add(token.text);
    return true;
  });
}

function getIssueWords(targetText, transcriptText) {
  return new Set(getWordPracticeTokens(targetText, transcriptText).map((token) => token.text));
}

function getTargetWordSegments(targetText) {
  return targetText
    .split(/[.!?。！？;；,，、:：]+/u)
    .map((segment) => segment.match(/[\p{L}\p{N}]+/gu) || [])
    .filter((segment) => segment.length > 0);
}

function getFocusPractice(targetText, transcriptText, providerContext = {}) {
  const whisperTranscript = providerContext.whisperTranscript ?? transcriptText;
  const nativeTranscript = providerContext.appleTranscript || providerContext.windowsSpeechTranscript || "";
  const nativeLabel = providerContext.nativeProviderLabel || getNativeProviderLabel(providerContext.nativeProvider);
  const whisperAvailable = (providerContext.whisperStatus ? isProviderUsable(providerContext.whisperStatus) : true) && whisperTranscript.trim();
  const nativeStatus = providerContext.windowsSpeechStatus || providerContext.appleStatus;
  const nativeAvailable = isProviderUsable(nativeStatus) && nativeTranscript.trim();
  const whisperIssues = whisperAvailable ? getWordPracticeTokens(targetText, whisperTranscript) : [];
  const nativeIssues = nativeAvailable ? getWordPracticeTokens(targetText, nativeTranscript) : [];
  const whisperIssueWords = new Set(whisperIssues.map((token) => token.text));
  const nativeIssueWords = new Set(nativeIssues.map((token) => token.text));
  const highConfidenceWord = [...whisperIssueWords].find((word) => nativeIssueWords.has(word));
  const practiceTokens = highConfidenceWord
    ? whisperIssues.filter((token) => token.text === highConfidenceWord)
    : [...whisperIssues, ...nativeIssues];
  const focusToken = practiceTokens[0] || null;
  const focusWord = focusToken?.text || "";
  const confidence = focusWord && nativeAvailable && whisperIssueWords.has(focusWord) && nativeIssueWords.has(focusWord)
    ? "high"
    : focusWord
      ? "possible"
      : "none";

  if (!focusWord) {
    return {
      word: "",
      phrase: "",
      confidence,
      reason: transcriptText
        ? "No single weak word stood out in the transcript."
        : "No transcript was returned for this attempt.",
      instruction: transcriptText
        ? "Keep the full sentence smooth. Listen once, shadow the model, then record again."
        : "Record again for 2-3 seconds in a quiet place so the checker can hear your words.",
    };
  }

  const segments = getTargetWordSegments(targetText);
  const targetSegment = segments.find((segment) =>
    segment.some((word) => word.toLowerCase() === focusWord.toLowerCase()),
  ) || [focusWord];
  const focusIndex = targetSegment.findIndex((word) => word.toLowerCase() === focusWord.toLowerCase());
  const phraseWords = focusIndex >= 0 && targetSegment[focusIndex + 1]
    ? targetSegment.slice(focusIndex, focusIndex + 2)
    : targetSegment.slice(Math.max(0, focusIndex - 1), focusIndex + 1);
  const phrase = phraseWords.join(" ");
  const reason = confidence === "high"
    ? `Both Whisper and ${nativeLabel} missed or questioned this word, so it is a high-confidence focus area.`
    : focusToken?.pairedWith
      ? `One STT transcript heard "${focusToken.pairedWith}" instead, so this word may need clearer pronunciation.`
      : "One STT transcript missed or questioned this word, so it may need clearer pronunciation.";

  return {
    word: focusWord,
    phrase,
    confidence,
    reason,
    instruction: `Practice "${phrase || focusWord}" slowly, then record the full sentence again.`,
  };
}

function renderWordPractice(targetText, transcriptText) {
  const practiceTokens = getWordPracticeTokens(targetText, transcriptText);
  const focusPractice = getFocusPractice(targetText, transcriptText);
  wordPracticeListEl.replaceChildren();
  clearWordPracticeAudio();

  if (practiceTokens.length === 0) {
    wordPracticeHelpEl.textContent = focusPractice.instruction;
    return;
  }

  const confidenceText = focusPractice.confidence === "high" ? "High-confidence issue." : "Possible issue.";
  wordPracticeHelpEl.textContent = `${confidenceText} Focus word: ${focusPractice.word}. ${focusPractice.instruction} Tap a word to hear it.`;

  for (const token of practiceTokens) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `secondary word-practice-button ${token.status}`;
    button.dataset.word = token.text;
    button.textContent = token.text;
    wordPracticeListEl.appendChild(button);
  }
}

function renderWordComparison(targetText, transcriptText) {
  const { targetTokens, transcriptTokens } = getWordDiff(targetText, transcriptText);
  wordComparisonResultEl.replaceChildren(
    renderTokenRow("Target", targetTokens),
    renderTokenRow("Transcript", transcriptTokens),
  );
  renderWordPractice(targetText, transcriptText);
}

function drawWaveform(canvas, audioBuffer, trimStart = 0, trimEnd = audioBuffer.duration) {
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const channelData = audioBuffer.getChannelData(0);
  const samplesPerPixel = Math.max(1, Math.floor(channelData.length / width));
  const trimStartX = (trimStart / audioBuffer.duration) * width;
  const trimEndX = (trimEnd / audioBuffer.duration) * width;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#dbeafe";
  context.fillRect(trimStartX, 0, Math.max(0, trimEndX - trimStartX), height);
  context.strokeStyle = "#2563eb";
  context.lineWidth = 1;
  context.beginPath();

  for (let x = 0; x < width; x += 1) {
    let min = 1;
    let max = -1;
    const start = x * samplesPerPixel;
    const end = Math.min(start + samplesPerPixel, channelData.length);

    for (let index = start; index < end; index += 1) {
      const value = channelData[index];
      min = Math.min(min, value);
      max = Math.max(max, value);
    }

    const yMin = ((1 - min) / 2) * height;
    const yMax = ((1 - max) / 2) * height;
    context.moveTo(x, yMin);
    context.lineTo(x, yMax);
  }

  context.stroke();
  context.strokeStyle = "#1d4ed8";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(trimStartX, 0);
  context.lineTo(trimStartX, height);
  context.moveTo(trimEndX, 0);
  context.lineTo(trimEndX, height);
  context.stroke();
}

function drawLiveWaveform() {
  if (!liveAnalyser) {
    return;
  }

  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(liveWaveformEl.clientWidth * pixelRatio));
  const height = Math.max(1, Math.floor(72 * pixelRatio));

  if (liveWaveformEl.width !== width || liveWaveformEl.height !== height) {
    liveWaveformEl.width = width;
    liveWaveformEl.height = height;
  }

  const context = liveWaveformEl.getContext("2d");
  const data = new Uint8Array(liveAnalyser.fftSize);
  liveAnalyser.getByteTimeDomainData(data);

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#2563eb";
  context.lineWidth = Math.max(2, pixelRatio * 1.5);
  context.beginPath();

  for (let index = 0; index < data.length; index += 1) {
    const x = (index / (data.length - 1)) * width;
    const y = (data[index] / 255) * height;

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }

  context.stroke();
  liveWaveformFrame = requestAnimationFrame(drawLiveWaveform);
}

function startLiveRecordingWaveform(stream) {
  const audioContext = getAudioContext();
  liveAudioSource = audioContext.createMediaStreamSource(stream);
  liveAnalyser = audioContext.createAnalyser();
  liveAnalyser.fftSize = 1024;
  liveAudioSource.connect(liveAnalyser);
  recordingMonitorEl.hidden = false;
  drawLiveWaveform();
}

function stopLiveRecordingWaveform() {
  if (liveWaveformFrame) {
    cancelAnimationFrame(liveWaveformFrame);
    liveWaveformFrame = null;
  }

  if (liveAudioSource) {
    liveAudioSource.disconnect();
    liveAudioSource = null;
  }

  liveAnalyser = null;
  recordingMonitorEl.hidden = true;
}

async function renderModelWaveform(audioUrl) {
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error("Could not load model audio.");
    }

    const audioContext = getAudioContext();
    const audioBuffer = await audioContext.decodeAudioData(await response.arrayBuffer());
    targetWaveformEl.hidden = false;
    targetWaveformEl.width = targetWaveformEl.clientWidth * window.devicePixelRatio;
    targetWaveformEl.height = 72 * window.devicePixelRatio;
    drawWaveform(targetWaveformEl, audioBuffer);
  } catch (_error) {
    targetWaveformEl.hidden = true;
  }
}

async function renderAttemptWaveforms() {
  const canvases = attemptsListEl.querySelectorAll(".waveform-canvas");

  for (const canvas of canvases) {
    const attemptId = Number(canvas.dataset.attemptId);
    const attempt = recordingAttempts.find((item) => item.id === attemptId);

    if (!attempt) {
      continue;
    }

    try {
      const audioBuffer = await getAttemptAudioBuffer(attempt);
      const trimStart = attempt.trimStart ?? 0;
      const trimEnd = attempt.trimEnd ?? audioBuffer.duration;
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = 72 * window.devicePixelRatio;
      drawWaveform(canvas, audioBuffer, trimStart, trimEnd);
      attempt.duration = audioBuffer.duration;
      attempt.trimStart = trimStart;
      attempt.trimEnd = trimEnd;

      const durationEl = attemptsListEl.querySelector(`[data-duration-for="${attempt.id}"]`);
      if (durationEl) {
        durationEl.textContent = `Duration ${formatDuration(audioBuffer.duration)}`;
      }
    } catch (_error) {
      const durationEl = attemptsListEl.querySelector(`[data-duration-for="${attempt.id}"]`);
      if (durationEl) {
        durationEl.textContent = "Waveform unavailable";
      }
    }
  }
}

async function updateTrimPreview(attemptId, changedEdge, value) {
  const attempt = recordingAttempts.find((item) => item.id === attemptId);

  if (!attempt) {
    return;
  }

  const audioBuffer = await getAttemptAudioBuffer(attempt);
  const duration = audioBuffer.duration;
  const seconds = (Number(value) / 100) * duration;

  if (changedEdge === "start") {
    attempt.trimStart = Math.min(seconds, (attempt.trimEnd ?? duration) - 0.1);
  } else {
    attempt.trimEnd = Math.max(seconds, (attempt.trimStart ?? 0) + 0.1);
  }

  attempt.duration = duration;
  const canvas = attemptsListEl.querySelector(`.waveform-canvas[data-attempt-id="${attempt.id}"]`);
  if (canvas) {
    drawWaveform(canvas, audioBuffer, attempt.trimStart ?? 0, attempt.trimEnd ?? duration);
  }
}

async function applyTrim(attemptId) {
  const attempt = recordingAttempts.find((item) => item.id === attemptId);

  if (!attempt) {
    return;
  }

  try {
    const audioBuffer = await getAttemptAudioBuffer(attempt);
    const trimStart = attempt.trimStart ?? 0;
    const trimEnd = attempt.trimEnd ?? audioBuffer.duration;

    if (trimEnd - trimStart < 0.25) {
      setStatus("Trim range is too short. Keep at least 0.25 seconds.");
      return;
    }

    const trimmedBlob = audioBufferToWavBlob(audioBuffer, trimStart, trimEnd);
    URL.revokeObjectURL(attempt.url);
    audioBufferCache.delete(attempt.id);
    attempt.blob = trimmedBlob;
    attempt.url = URL.createObjectURL(trimmedBlob);
    attempt.duration = trimEnd - trimStart;
    attempt.trimStart = 0;
    attempt.trimEnd = attempt.duration;
    attempt.manualTrimmed = true;
    attempt.result = null;
    resetResults();
    await saveAttemptToDb(attempt);
    renderAttempts();
    renderComparisonControls();
    setStatus("Trim applied. Check the trimmed recording when ready.");
  } catch (_error) {
    setStatus("Could not trim this recording.");
  }
}

function audioBufferToWavBlob(audioBuffer, startSeconds, endSeconds) {
  const sampleRate = audioBuffer.sampleRate;
  const channelCount = audioBuffer.numberOfChannels;
  const startFrame = Math.max(0, Math.floor(startSeconds * sampleRate));
  const endFrame = Math.min(audioBuffer.length, Math.floor(endSeconds * sampleRate));
  const frameCount = Math.max(1, endFrame - startFrame);
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;

  function writeString(value) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset, value.charCodeAt(index));
      offset += 1;
    }
  }

  writeString("RIFF");
  view.setUint32(offset, 36 + dataSize, true);
  offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, channelCount, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * blockAlign, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, 16, true);
  offset += 2;
  writeString("data");
  view.setUint32(offset, dataSize, true);
  offset += 4;

  for (let frame = startFrame; frame < endFrame; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function renderPracticeHistory() {
  const history = getPracticeHistory();

  if (history.length === 0) {
    historyListEl.innerHTML = '<p class="empty-attempts">No checked sessions yet.</p>';
    showAllHistoryBtn.hidden = true;
    return;
  }

  const visibleHistory = showAllHistory ? history : history.slice(0, 3);
  showAllHistoryBtn.hidden = history.length <= 3;
  showAllHistoryBtn.textContent = showAllHistory ? "Show latest 3" : `Show all history (${history.length})`;

  historyListEl.innerHTML = visibleHistory
    .map((result, index) => {
      const date = result.checkedAt ? new Date(result.checkedAt).toLocaleString() : "Unknown date";
      const language = (result.language || "").toUpperCase();
      const scoreSummary = getWordAccuracySummary(result);
      const focusPractice = getResultFocusPractice(result);
      return `
        <button type="button" class="history-item" data-history-index="${index}">
          <span>${date}</span>
          <strong>${scoreSummary}</strong>
          <small>${language} ${result.targetText || ""}</small>
          <small>Focus: ${focusPractice.word || "full sentence"}</small>
        </button>
      `;
    })
    .join("");
}

function getCheckedAttempts() {
  return recordingAttempts.filter((attempt) => attempt.result);
}

function renderCompareCard(attempt, label) {
  if (!attempt?.result) {
    return '<article class="compare-card"><p>Select a checked attempt.</p></article>';
  }

  const focusPractice = getResultFocusPractice(attempt.result);

  return `
    <article class="compare-card">
      <span class="result-label">${label}</span>
      <strong>${getWordAccuracySummary(attempt.result)}</strong>
      <p><b>Focus:</b> ${focusPractice.word || "full sentence"}</p>
      <p><b>Transcript:</b> ${attempt.result.transcript || "No speech detected."}</p>
      <p><b>Feedback:</b> ${attempt.result.feedback}</p>
    </article>
  `;
}

function renderComparisonSummary(firstAttempt, secondAttempt) {
  const first = firstAttempt.result;
  const second = secondAttempt.result;
  const accuracyDelta = getWordAccuracyValue(second) - getWordAccuracyValue(first);
  const firstFluency = getFluencyTimingValue(first);
  const secondFluency = getFluencyTimingValue(second);
  const fluencyDelta = Number.isFinite(firstFluency) && Number.isFinite(secondFluency)
    ? secondFluency - firstFluency
    : NaN;
  const firstFocus = getResultFocusPractice(first).word || "";
  const secondFocus = getResultFocusPractice(second).word || "";
  const focusImproved = firstFocus && firstFocus !== secondFocus
    ? `"${firstFocus}" is no longer the main focus word.`
    : firstFocus
      ? `"${firstFocus}" is still the main focus word.`
      : "No repeated focus word issue.";

  return `
    <article class="compare-summary">
      <strong>Progress</strong>
      <p>Word accuracy: ${formatScoreDelta(accuracyDelta)}.</p>
      <p>Fluency / timing: ${formatScoreDelta(fluencyDelta)}.</p>
      <p>Focus word: ${focusImproved}</p>
    </article>
  `;
}

function renderComparisonView() {
  const firstAttempt = recordingAttempts.find((attempt) => String(attempt.id) === compareFirstEl.value);
  const secondAttempt = recordingAttempts.find((attempt) => String(attempt.id) === compareSecondEl.value);

  if (!firstAttempt || !secondAttempt) {
    comparisonViewEl.innerHTML = '<p class="empty-attempts">Check at least two recordings to compare progress.</p>';
    return;
  }

  comparisonViewEl.innerHTML = `
    ${renderComparisonSummary(firstAttempt, secondAttempt)}
    ${renderCompareCard(firstAttempt, `Attempt ${recordingAttempts.indexOf(firstAttempt) + 1}`)}
    ${renderCompareCard(secondAttempt, `Attempt ${recordingAttempts.indexOf(secondAttempt) + 1}`)}
  `;
}

function renderComparisonControls() {
  const checkedAttempts = getCheckedAttempts();

  if (checkedAttempts.length < 2) {
    compareFirstEl.innerHTML = '<option value="">Need two checked attempts</option>';
    compareSecondEl.innerHTML = '<option value="">Need two checked attempts</option>';
    compareFirstEl.disabled = true;
    compareSecondEl.disabled = true;
    renderComparisonView();
    return;
  }

  const options = checkedAttempts
    .map((attempt) => {
      const attemptNumber = recordingAttempts.indexOf(attempt) + 1;
      return `<option value="${attempt.id}">Attempt ${attemptNumber} · ${getWordAccuracySummary(attempt.result)}</option>`;
    })
    .join("");

  compareFirstEl.disabled = false;
  compareSecondEl.disabled = false;
  compareFirstEl.innerHTML = options;
  compareSecondEl.innerHTML = options;
  compareFirstEl.value = String(checkedAttempts.at(-2).id);
  compareSecondEl.value = String(checkedAttempts.at(-1).id);
  renderComparisonView();
}

function updateCheckSelectedState() {
  const hasSelectedAttempt = Boolean(getSelectedAttempt());
  checkSelectedBtn.disabled = !hasSelectedAttempt || isRecording || isSubmitting;

  if (recordingAttempts.length >= MAX_ATTEMPTS && !isRecording) {
    attemptHelperEl.textContent = "Maximum 10 recordings saved. Delete one to record again.";
    return;
  }

  attemptHelperEl.textContent = hasSelectedAttempt
    ? "Selected recording is ready to check."
    : "Record and select one attempt before checking.";
}

function updateRecordingLimitState() {
  startBtn.disabled = isSubmitting || recordingAttempts.length >= MAX_ATTEMPTS;
  updateCheckSelectedState();
}

function renderAttempts() {
  attemptCountEl.textContent = `${recordingAttempts.length}/${MAX_ATTEMPTS} saved`;

  if (recordingAttempts.length === 0) {
    attemptsListEl.innerHTML = '<p class="empty-attempts">No recordings yet. Start recording to save an attempt.</p>';
    updateCheckSelectedState();
    updateRecordingLimitState();
    return;
  }

  attemptsListEl.innerHTML = recordingAttempts
    .map((attempt, index) => {
      const isSelected = attempt.id === selectedAttemptId;
      const selectLabel = isSelected ? "Selected" : "Select this attempt";
      const resultSummary = attempt.result
        ? `
          <div class="attempt-result-summary">
            <span>Checked</span>
            <strong>${getWordAccuracySummary(attempt.result)}</strong>
          </div>
        `
        : '<div class="attempt-result-summary muted">Not checked yet</div>';

      return `
        <article class="attempt-card${isSelected ? " selected" : ""}" data-attempt-id="${attempt.id}">
          <div class="attempt-header">
            <div class="attempt-title">
              <strong>Attempt ${index + 1}</strong>
              ${isSelected ? '<span class="selected-badge">Selected</span>' : ""}
            </div>
            ${resultSummary}
          </div>
          <div class="attempt-audio-row">
            <audio controls src="${attempt.url}"></audio>
          </div>
          <div class="attempt-waveform-row">
            <canvas class="waveform-canvas" data-attempt-id="${attempt.id}" height="72"></canvas>
          </div>
          <div class="trim-section">
            <div class="trim-section-header">
              <span>Trim recording</span>
              <span class="trim-duration" data-duration-for="${attempt.id}">Loading waveform...</span>
            </div>
            <div class="trim-controls">
              <label>
                <span>Start</span>
                <input type="range" min="0" max="100" value="${Math.round(((attempt.trimStart || 0) / Math.max(attempt.duration || 1, 1)) * 100)}" data-action="trim-start" data-attempt-id="${attempt.id}">
              </label>
              <label>
                <span>End</span>
                <input type="range" min="0" max="100" value="${Math.round(((attempt.trimEnd || attempt.duration || 1) / Math.max(attempt.duration || 1, 1)) * 100)}" data-action="trim-end" data-attempt-id="${attempt.id}">
              </label>
            </div>
          </div>
          <div class="attempt-actions">
            <button type="button" class="secondary utility-button apply-trim" data-action="apply-trim" data-attempt-id="${attempt.id}">Apply Trim</button>
            <button type="button" class="secondary utility-button attempt-select" data-action="select" data-attempt-id="${attempt.id}" ${isSelected ? "disabled" : ""}>
              ${selectLabel}
            </button>
            <button type="button" class="delete-button utility-button" data-action="delete" data-attempt-id="${attempt.id}" aria-label="Delete Attempt ${index + 1}">
              Delete
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  updateCheckSelectedState();
  updateRecordingLimitState();
  renderAttemptWaveforms();
}

function addRecordingAttempt(blob) {
  const attempt = {
    id: nextAttemptId,
    blob,
    createdAt: new Date().toISOString(),
    url: URL.createObjectURL(blob),
  };

  nextAttemptId += 1;
  recordingAttempts.push(attempt);
  selectedAttemptId = attempt.id;
  renderAttempts();
  saveAttemptToDb(attempt);
}

function deleteRecordingAttempt(attemptId) {
  const attempt = recordingAttempts.find((item) => item.id === attemptId);

  if (attempt) {
    URL.revokeObjectURL(attempt.url);
  }

  recordingAttempts = recordingAttempts.filter((item) => item.id !== attemptId);

  if (selectedAttemptId === attemptId) {
    selectedAttemptId = null;
    resetResults();
  }

  renderAttempts();
  renderComparisonControls();
  deleteAttemptFromDb(attemptId);
}

function resetResults({ keepWordPractice = false } = {}) {
  overallScoreEl.textContent = "--";
  fluencyScoreSummaryEl.textContent = "--";
  focusWordResultEl.textContent = "Focus word: --";
  teacherFeedbackResultEl.textContent = "Listen again, repeat slowly, then record. Focus on words that look different.";
  targetResultEl.textContent = "";
  transcriptResultEl.textContent = "";
  appleTranscriptCardEl.hidden = true;
  nativeTranscriptLabelEl.textContent = "Native STT transcript";
  appleTranscriptResultEl.textContent = "";
  wordComparisonResultEl.textContent = "";
  if (languageTipResultEl) {
    languageTipResultEl.textContent = "";
  }
  fluencyResultEl.textContent = "";
  timingMatchEl.textContent = "--";
  rhythmMatchEl.textContent = "--";
  acousticSimilarityEl.textContent = "--";
  modelDurationEl.textContent = "--";
  userDurationEl.textContent = "--";
  speedRatioEl.textContent = "--";
  mainFluencyIssueEl.textContent = "--";
  silenceRemovedEl.textContent = "--";
  exactRatioEl.textContent = "--";
  partialRatioEl.textContent = "--";
  tokenSortRatioEl.textContent = "--";
  comparisonResultEl.textContent = "";
  if (!keepWordPractice) {
    wordPracticeHelpEl.textContent = "Check a recording to see words you can practice one by one.";
    wordPracticeListEl.replaceChildren();
    clearWordPracticeAudio();
  }
  exportReportBtn.disabled = true;
  displayedResult = null;
}

function getSection(text, heading) {
  const pattern = new RegExp(`${heading}:\\n([\\s\\S]*?)(?=\\n\\n[A-Z][^\\n]*:|\\nSaved to:|$)`, "i");
  const match = text.match(pattern);
  return match ? match[1].trim() : "";
}

function getMetric(text, label) {
  const pattern = new RegExp(`${label}:\\s*([0-9.]+/100)`, "i");
  const match = text.match(pattern);
  return match ? match[1] : "--";
}

function getOverallScore(comparisonText) {
  return getMetric(comparisonText, "Exact-style ratio");
}

function formatSuggestion(text) {
  return text
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean)
    .join(" ");
}

function getHighAccuracyLowFluencyNote(scoreValue, audioSimilarity) {
  if (!Number.isFinite(scoreValue) || scoreValue < 85 || audioSimilarity?.status !== "ok") {
    return "";
  }

  const timingScore = Number(audioSimilarity.timing_match);
  const rhythmScore = Number(audioSimilarity.rhythm_match);
  const isLowFluency = Number.isFinite(timingScore) && Number.isFinite(rhythmScore)
    ? (timingScore + rhythmScore) / 2 < 72
    : false;
  const slowerThanModel = Number(audioSimilarity.duration_difference) > 0.4;

  if (isLowFluency && slowerThanModel) {
    return "Your words were understood well, but your pace was slower than the model audio.";
  }

  return "";
}

function buildTeacherFeedback({ feedback, focusPractice, scoreValue, audioSimilarity }) {
  if (!focusPractice?.word && focusPractice?.confidence === "invalid") {
    return [
      "Overall: No valid STT transcript was produced. Please check microphone volume or record again.",
      "Focus word: full sentence",
      "Why: The checker could not use the STT transcript safely.",
      "Next step: Record again in a quiet place and check that the microphone level is moving.",
    ].join("\n\n");
  }

  const overallComment = getHighAccuracyLowFluencyNote(scoreValue, audioSimilarity) || feedback || "Review the transcript and try again.";
  const focusLabel = focusPractice?.word
    ? `${focusPractice.word}${focusPractice.phrase && focusPractice.phrase !== focusPractice.word ? ` (${focusPractice.phrase})` : ""}`
    : "full sentence";
  const whySelected = focusPractice?.reason || "No single word stood out as the main issue.";
  const nextStep = focusPractice?.instruction || "Listen to the model once, then record the full sentence again.";

  return [
    `Overall: ${overallComment}`,
    `Focus word: ${focusLabel}`,
    `Why: ${whySelected}`,
    `Next step: ${nextStep}`,
  ].join("\n\n");
}

function buildResult(data, language, attemptNumber, durationSeconds = null) {
  const comparison = data.comparison || "";
  const transcript = (data.transcript || "").trim();
  const bothScores = data.scores || null;
  const bothTranscripts = data.transcripts || null;
  const nativeProvider = data.nativeProvider || platformConfig.nativeProvider || (data.sttProvider === "windows_speech" ? "windows_speech" : data.sttProvider === "apple" ? "apple" : "");
  const overallScore = getOverallScore(comparison);
  const scoreValue = getScoreValue(overallScore);
  const scoreLabel = getScoreLabel(scoreValue);
  const targetText = data.targetText || getSection(comparison, "Target sentence") || "";
  const rawWhisperTranscript = bothTranscripts?.whisper || (data.sttProvider !== "apple" && data.sttProvider !== "windows_speech" ? transcript : "");
  const rawAppleTranscript = bothTranscripts?.apple || (data.sttProvider === "apple" ? transcript : "");
  const rawWindowsSpeechTranscript = bothTranscripts?.windows_speech || (data.sttProvider === "windows_speech" ? transcript : "");
  const initialWhisperStatus = data.whisperStatus || (data.sttProvider === "apple" || data.sttProvider === "windows_speech" ? "skipped" : "ok");
  const initialAppleStatus = data.appleStatus || (data.sttProvider === "apple" ? "ok" : "skipped");
  const initialWindowsSpeechStatus = data.windowsSpeechStatus || (data.sttProvider === "windows_speech" ? "ok" : "skipped");
  const checkedWhisper = normalizeProviderStatus(initialWhisperStatus, rawWhisperTranscript, data.whisperNote || "");
  const checkedApple = normalizeProviderStatus(initialAppleStatus, rawAppleTranscript, data.appleNote || "");
  const checkedWindowsSpeech = normalizeProviderStatus(initialWindowsSpeechStatus, rawWindowsSpeechTranscript, data.windowsSpeechNote || "");
  const whisperStatus = checkedWhisper.status;
  const whisperNote = checkedWhisper.note;
  const appleStatus = checkedApple.status;
  const appleNote = checkedApple.note;
  const windowsSpeechStatus = checkedWindowsSpeech.status;
  const windowsSpeechNote = checkedWindowsSpeech.note;
  const whisperTranscript = isProviderUsable(whisperStatus) ? rawWhisperTranscript : "";
  const appleTranscript = isProviderUsable(appleStatus) ? rawAppleTranscript : "";
  const windowsSpeechTranscript = isProviderUsable(windowsSpeechStatus) ? rawWindowsSpeechTranscript : "";
  const sanitizedBothTranscripts = bothTranscripts
    ? {
      whisper: whisperTranscript,
      apple: appleTranscript,
      windows_speech: windowsSpeechTranscript,
    }
    : null;
  const primaryTranscript = whisperTranscript || appleTranscript || windowsSpeechTranscript || "";
  const invalidMessage = "No valid STT transcript was produced. Please check microphone volume or record again.";
  const feedback = primaryTranscript
    ? getSection(comparison, "Feedback") || "Review the transcript and try again."
    : invalidMessage;
  const suggestion = primaryTranscript
    ? formatSuggestion(getSection(comparison, "Practice suggestion")) || "Listen to the model audio, record again, and compare your transcript."
    : "Record again for 2-3 seconds in a quiet place and speak clearly into the microphone.";
  const languageTip = LANGUAGE_TIPS[language] || "Listen to the model audio, repeat slowly, and compare the transcript.";
  const focusPractice = primaryTranscript
    ? getFocusPractice(targetText, primaryTranscript, {
      whisperTranscript,
      whisperStatus,
      appleTranscript,
      appleStatus,
      windowsSpeechTranscript,
      windowsSpeechStatus,
      nativeProvider,
      nativeProviderLabel: getNativeProviderLabel(nativeProvider),
    })
    : {
      word: "",
      phrase: "",
      confidence: "invalid",
      reason: "No valid STT transcript was produced, so no focus word was selected.",
      instruction: "Record again in a quiet place and check microphone volume before scoring.",
    };
  const audioSimilarity = data.audioSimilarity || null;
  const teacherFeedback = buildTeacherFeedback({
    feedback,
    focusPractice,
    scoreValue,
    audioSimilarity,
  });

  return {
    id: data.attemptId || crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    attemptId: data.attemptId || data.resultJson?.attemptId || "",
    attemptNumber,
    checkedAt: data.createdAt || data.resultJson?.createdAt || new Date().toISOString(),
    language,
    sttProvider: data.sttProvider || "whisper",
    nativeProvider,
    nativeProviderLabel: getNativeProviderLabel(nativeProvider),
    languageTip,
    targetText,
    transcript,
    bothScores,
    bothTranscripts: sanitizedBothTranscripts,
    whisperStatus,
    whisperNote,
    appleStatus,
    appleNote,
    windowsSpeechStatus,
    windowsSpeechNote,
    comparison,
    overallScore,
    scoreValue,
    scoreLabel,
    feedback,
    suggestion,
    focusPractice,
    teacherFeedback,
    audioSimilarity,
    autoTrim: data.autoTrim || audioSimilarity?.auto_trim || null,
    timingBreakdown: data.timingBreakdown || data.resultJson?.timingBreakdown || null,
    resultJson: data.resultJson || null,
    resultJsonPath: data.resultJsonPath || data.resultJson?.files?.resultJson || "",
    fluency: buildFluencyAnalysis(primaryTranscript, durationSeconds),
    metrics: {
      exactRatio: getMetric(comparison, "Exact-style ratio"),
      partialRatio: getMetric(comparison, "Partial ratio"),
      tokenSortRatio: getMetric(comparison, "Token-sort ratio"),
    },
  };
}

function renderResults(result) {
  displayedResult = result;
  comparisonResultEl.textContent = result.comparison || "";
  const audioSimilarity = result.audioSimilarity || null;
  const primaryTranscript = getPrimaryValidTranscript(result);
  overallScoreEl.textContent = getWordAccuracySummary(result);
  fluencyScoreSummaryEl.textContent = getFluencyTimingScore(audioSimilarity);
  const focusPractice = getResultFocusPractice(result);
  focusWordResultEl.textContent = focusPractice.word
    ? `Focus word: ${focusPractice.word}${focusPractice.confidence === "high" ? " · high-confidence issue" : " · possible issue"}`
    : "Focus word: full sentence";
  teacherFeedbackResultEl.textContent = buildTeacherFeedback({
    feedback: result.feedback,
    focusPractice,
    scoreValue: result.scoreValue,
    audioSimilarity,
  });
  targetResultEl.textContent = result.targetText || "";

  if (isProviderUsable(result.whisperStatus)) {
    const recoveredNote = result.whisperStatus === "ok_retry" ? "Whisper recovered after retry.\n\n" : "";
    transcriptResultEl.textContent = `${recoveredNote}${result.bothTranscripts?.whisper || result.transcript}`;
  } else if (result.whisperStatus === "invalid") {
    transcriptResultEl.textContent = `Whisper invalid transcript. It was ignored for scoring${result.whisperNote ? `: ${result.whisperNote}` : "."}`;
  } else if (result.whisperStatus === "skipped") {
    transcriptResultEl.textContent = "Whisper skipped for this check.";
  } else {
    transcriptResultEl.textContent = `Whisper unavailable${result.whisperNote ? `: ${result.whisperNote}` : "."}`;
  }

  const nativeProvider = getNativeProviderKey(result);
  const nativeLabel = getNativeProviderLabel(nativeProvider);
  const nativeStatus = getNativeStatus(result);
  const nativeNote = getNativeNote(result);
  if (result.bothTranscripts || result.sttProvider === "apple" || result.sttProvider === "windows_speech") {
    appleTranscriptCardEl.hidden = false;
    nativeTranscriptLabelEl.textContent = `${nativeLabel} STT transcript`;
    if (isProviderUsable(nativeStatus)) {
      appleTranscriptResultEl.textContent = getNativeTranscript(result) || `No ${nativeLabel} transcript returned.`;
    } else if (nativeStatus === "invalid") {
      appleTranscriptResultEl.textContent = `${nativeLabel} invalid transcript. It was ignored for scoring${nativeNote ? `: ${nativeNote}` : "."}`;
    } else if (nativeStatus === "skipped") {
      appleTranscriptResultEl.textContent = `${nativeLabel} STT skipped for this check.`;
    } else {
      appleTranscriptResultEl.textContent = `${nativeLabel} unavailable${nativeNote ? `: ${nativeNote}` : "."}`;
    }
  } else {
    appleTranscriptCardEl.hidden = true;
    appleTranscriptResultEl.textContent = "";
  }

  if (languageTipResultEl) {
    languageTipResultEl.textContent = result.languageTip;
  }
  fluencyResultEl.textContent = audioSimilarity?.status === "ok"
    ? getFluencyExplanation(audioSimilarity)
    : result.fluency?.hint || audioSimilarity?.pace_hint || "Fluency timing is available for checked recording attempts.";
  timingMatchEl.textContent = audioSimilarity?.status === "ok" ? formatScoreNumber(audioSimilarity.timing_match) : "--";
  rhythmMatchEl.textContent = audioSimilarity?.status === "ok" ? formatScoreNumber(audioSimilarity.rhythm_match) : "--";
  acousticSimilarityEl.textContent = audioSimilarity?.status === "ok" ? formatScoreNumber(audioSimilarity.acoustic_similarity) : "--";
  modelDurationEl.textContent = audioSimilarity?.status === "ok" ? formatSecondsValue(audioSimilarity.model_duration) : "--";
  userDurationEl.textContent = audioSimilarity?.status === "ok" ? formatSecondsValue(audioSimilarity.user_duration) : "--";
  speedRatioEl.textContent = audioSimilarity?.status === "ok" ? formatSpeedRatio(audioSimilarity.speed_ratio) : "--";
  mainFluencyIssueEl.textContent = audioSimilarity?.status === "ok" ? audioSimilarity.main_issue || "--" : "--";
  silenceRemovedEl.textContent = audioSimilarity?.status === "ok"
    ? formatSecondsValue(audioSimilarity.auto_trim?.silence_removed ?? audioSimilarity.user_silence_removed)
    : "--";
  renderWordComparison(result.targetText || "", primaryTranscript);

  exactRatioEl.textContent = result.metrics.exactRatio;
  partialRatioEl.textContent = result.metrics.partialRatio;
  tokenSortRatioEl.textContent = result.metrics.tokenSortRatio;
  exportReportBtn.disabled = false;
}

function setMainControlsDisabled(disabled) {
  languageEl.disabled = disabled;
  whisperModelEl.disabled = disabled;
  sttProviderEl.disabled = disabled;
  whisperDeviceEl.disabled = disabled;
  targetTextEl.disabled = disabled;
  microphoneSelectEl.disabled = disabled;
  audioBtn.disabled = disabled;
  startBtn.disabled = disabled || recordingAttempts.length >= MAX_ATTEMPTS;
  updateCheckSelectedState();
}

function setStopVisible(visible) {
  stopBtn.hidden = !visible;
  stopBtn.disabled = !visible;
  startBtn.hidden = visible;
  startBtn.textContent = visible ? "Stop Recording" : "Start Recording";
}

function setCancelVisible(visible) {
  cancelSubmissionBtn.hidden = !visible;
  cancelSubmissionBtn.disabled = !visible;
}

function clearPreviousSubmissionOnly() {
  if (submitAbortController) {
    submitAbortController.abort();
    submitAbortController = null;
  }

  resetResults();
  setCancelVisible(false);
  isSubmitting = false;
}

function resetIdleControls() {
  isRecording = false;
  isSubmitting = false;
  setMainControlsDisabled(false);
  setStopVisible(false);
  setCancelVisible(false);
}

async function submitRecording() {
  if (isSubmitting) {
    setStatus("A recording is already being checked. Wait for it to finish or cancel it first.");
    return;
  }

  const language = languageEl.value;
  const targetText = getTargetText();

  if (!targetText) {
    setStatus("Please paste a target sentence first.");
    resetIdleControls();
    return;
  }

  const selectedAttempt = getSelectedAttempt();

  if (!selectedAttempt) {
    setStatus("Record and select one attempt before checking.");
    resetIdleControls();
    return;
  }

  submitAbortController = new AbortController();
  isSubmitting = true;
  setMainControlsDisabled(true);
  setStopVisible(false);
  setCancelVisible(true);
  startCheckingProgress(sttProviderEl.value);
  const modelLabel = whisperModelEl.selectedOptions[0]?.textContent || whisperModelEl.value;
  setStatus(`Checking Attempt ${recordingAttempts.findIndex((attempt) => attempt.id === selectedAttempt.id) + 1} with ${modelLabel} on ${whisperDeviceEl.value}...`);

  try {
    const formData = new FormData();
    formData.append("language", language);
    formData.append("sttProvider", sttProviderEl.value);
    formData.append("whisperModel", whisperModelEl.value);
    formData.append("whisperDevice", whisperDeviceEl.value);
    formData.append("targetText", targetText);
    formData.append("manualTrimmed", selectedAttempt.manualTrimmed ? "true" : "false");
    formData.append("audio", selectedAttempt.blob, "my_recording.webm");

    const response = await fetch(`${API_BASE}/api/practice`, {
      method: "POST",
      body: formData,
      signal: submitAbortController.signal,
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unknown backend error");
    }

    const attemptNumber = getSelectedAttemptNumber();
    const audioBuffer = await getAttemptAudioBuffer(selectedAttempt).catch(() => null);
    const durationSeconds = audioBuffer?.duration || selectedAttempt.duration || null;
    const result = buildResult(data, language, attemptNumber, durationSeconds);
    selectedAttempt.result = result;
    renderResults(result);
    setProgressStep("feedback", "done", "done");
    savePracticeHistory(result);
    setProgressStep("history", "done", "done");
    saveAttemptToDb(selectedAttempt);
    renderComparisonControls();
    finishCheckingProgress(data);
    hideCheckingProgress();
    if (result.whisperStatus === "ok_retry") {
      setStatus("Whisper recovered after retry.");
    } else if (result.whisperStatus === "invalid") {
      setStatus("Whisper unavailable. Using another valid provider if available.");
    } else {
      setStatus("Done.");
    }
  } catch (error) {
    if (error.name === "AbortError") {
      failCheckingProgress("Submission cancelled.");
      hideCheckingProgress();
      setStatus("Submission cancelled.");
    } else {
      failCheckingProgress(`Whisper failed: ${error.message}`, true);
      setStatus(`Submission failed: ${error.message}`);
    }
  } finally {
    submitAbortController = null;
    resetIdleControls();
    renderAttempts();
  }
}

audioBtn.addEventListener("click", async () => {
  try {
    const targetText = getTargetText();

    if (!targetText) {
      setStatus("Please paste a target sentence first.");
      return;
    }

    audioBtn.disabled = true;
    setStatus("Generating target audio...");

    const response = await fetch(`${API_BASE}/api/target-audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: languageEl.value,
        targetText,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unknown backend error");
    }

    targetAudioEl.src = `${API_BASE}${data.audioUrl}`;
    targetAudioEl.hidden = false;
    await renderModelWaveform(targetAudioEl.src);
    await targetAudioEl.play().catch(() => {});
    setStatus("Target audio ready.");
  } catch (error) {
    setStatus(`Target audio error: ${error.message}`);
  } finally {
    if (!isRecording && !isSubmitting) {
      audioBtn.disabled = false;
    }
  }
});

buildChunksBtn.addEventListener("click", () => {
  const targetText = getTargetText();

  if (!targetText) {
    setStatus("Please paste a target sentence first.");
    return;
  }

  fullSentenceText = targetText;
  const chunks = splitIntoChunks(targetText);
  renderChunks(chunks);
  setStatus(chunks.length > 1 ? "Chunks ready. Choose one to practice." : "This sentence is already short enough to practice as one chunk.");
});

restoreFullSentenceBtn.addEventListener("click", () => {
  if (!fullSentenceText) {
    return;
  }

  targetTextEl.value = fullSentenceText;
  chunkListEl.querySelectorAll(".chunk-button").forEach((button) => button.classList.remove("active"));
  setStatus("Full sentence restored.");
});

chunkListEl.addEventListener("click", (event) => {
  const button = event.target.closest(".chunk-button");

  if (!button) {
    return;
  }

  targetTextEl.value = button.textContent.replace(/^Chunk\s+\d+\s*/i, "").trim();
  chunkListEl.querySelectorAll(".chunk-button").forEach((item) => item.classList.toggle("active", item === button));
  resetResults();
  setStatus("Chunk selected. Generate model audio or record when ready.");
});

startBtn.addEventListener("click", async () => {
  try {
    if (recordingAttempts.length >= MAX_ATTEMPTS) {
      setStatus("Maximum 10 recordings saved. Delete one to record again.");
      updateRecordingLimitState();
      return;
    }

    clearPreviousSubmissionOnly();

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Microphone recording requires a browser with media-device support on localhost or HTTPS.");
      resetIdleControls();
      return;
    }

    recordedChunks = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: getRecordingAudioConstraints() });
    await loadMicrophones();
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const recordedBlob = new Blob(recordedChunks, { type: "audio/webm" });
      addRecordingAttempt(recordedBlob);
      setStatus("Recording saved. Select an attempt, then check it when ready.");
      stopLiveRecordingWaveform();
      stream.getTracks().forEach((track) => track.stop());
      resetIdleControls();
    };

    mediaRecorder.start();
    isRecording = true;
    setMainControlsDisabled(true);
    startLiveRecordingWaveform(stream);
    setStopVisible(true);
    setCancelVisible(false);
    setStatus("Recording... Speak now.");
  } catch (error) {
    stopLiveRecordingWaveform();
    setStatus(getMicrophoneErrorMessage(error));
    resetIdleControls();
  }
});

stopBtn.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    stopBtn.disabled = true;
    setStatus("Saving recording...");
    mediaRecorder.stop();
  }
});

cancelSubmissionBtn.addEventListener("click", () => {
  if (submitAbortController) {
    cancelSubmissionBtn.disabled = true;
    setStatus("Submission cancelled.");
    submitAbortController.abort();
  }
});

languageEl.addEventListener("change", () => {
  const changedToBenchmark = setBenchmarkTargetForLanguage();
  setStatus(
    changedToBenchmark
      ? "Benchmark target sentence loaded for this language."
      : "Language changed. Your custom target sentence was kept.",
  );
});

microphoneSelectEl.addEventListener("change", () => {
  const selectedOption = microphoneSelectEl.selectedOptions[0];
  setStatus(`Microphone selected: ${selectedOption?.textContent || "Default microphone"}.`);
});

attemptsListEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const attemptId = Number(button.dataset.attemptId);

  if (button.dataset.action === "select") {
    selectedAttemptId = attemptId;
    renderAttempts();
    const selectedAttempt = getSelectedAttempt();
    if (selectedAttempt?.result) {
      renderResults(selectedAttempt.result);
    }
    setStatus(`Attempt ${recordingAttempts.findIndex((attempt) => attempt.id === attemptId) + 1} selected.`);
    return;
  }

  if (button.dataset.action === "delete") {
    deleteRecordingAttempt(attemptId);
    setStatus("Recording attempt deleted.");
    return;
  }

  if (button.dataset.action === "apply-trim") {
    applyTrim(attemptId);
  }
});

attemptsListEl.addEventListener("input", (event) => {
  const input = event.target.closest("input[type='range'][data-action]");

  if (!input) {
    return;
  }

  const attemptId = Number(input.dataset.attemptId);
  const edge = input.dataset.action === "trim-start" ? "start" : "end";
  updateTrimPreview(attemptId, edge, input.value);
});

checkSelectedBtn.addEventListener("click", (event) => {
  event.preventDefault();
  submitRecording();
});

compareFirstEl.addEventListener("change", renderComparisonView);
compareSecondEl.addEventListener("change", renderComparisonView);

wordPracticeListEl.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-word]");

  if (!button) {
    return;
  }

  const word = button.dataset.word;

  try {
    button.disabled = true;
    setStatus(`Generating word audio for "${word}"...`);

    const response = await fetch(`${API_BASE}/api/target-audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: languageEl.value,
        targetText: word,
        audioKind: "word",
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unknown backend error");
    }

    targetTextEl.value = word;
    fullSentenceText = "";
    renderChunks([]);
    resetResults({ keepWordPractice: true });
    wordPracticeAudioEl.src = `${API_BASE}${data.audioUrl}`;
    wordPracticeAudioEl.hidden = false;
    await wordPracticeAudioEl.play().catch(() => {});
    setStatus(`Practicing "${word}". Listen, record, then check this word.`);
  } catch (error) {
    setStatus(`Word audio error: ${error.message}`);
  } finally {
    button.disabled = false;
  }
});

historyListEl.addEventListener("click", (event) => {
  const button = event.target.closest(".history-item");

  if (!button) {
    return;
  }

  const result = getPracticeHistory()[Number(button.dataset.historyIndex)];
  if (result) {
    renderResults(result);
    setStatus("Loaded practice history item.");
  }
});

showAllHistoryBtn.addEventListener("click", () => {
  showAllHistory = !showAllHistory;
  renderPracticeHistory();
});

clearLocalDataBtn.addEventListener("click", async () => {
  if (!window.confirm("Clear practice history, saved browser recordings, and generated backend run files?")) {
    return;
  }

  try {
    clearLocalDataBtn.disabled = true;
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    await clearAttemptsFromDb();
    for (const attempt of recordingAttempts) {
      if (attempt.url) {
        URL.revokeObjectURL(attempt.url);
      }
    }
    recordingAttempts = [];
    selectedAttemptId = null;
    nextAttemptId = 1;
    audioBufferCache.clear();
    resetResults();
    renderAttempts();
    renderComparisonControls();
    renderPracticeHistory();

    const response = await fetch(`${API_BASE}/api/local-data`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Backend cleanup failed.");
    }
    clearTargetAudio();
    clearWordPracticeAudio();
    setStatus("Practice history and local run files cleared.");
  } catch (error) {
    setStatus(`Cleanup failed: ${error.message}`);
  } finally {
    clearLocalDataBtn.disabled = false;
  }
});

speedButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const speed = Number.parseFloat(button.dataset.speed);
    targetAudioEl.playbackRate = speed;
    speedButtons.forEach((item) => item.classList.toggle("active", item === button));
  });
});

exportReportBtn.addEventListener("click", () => {
  if (!displayedResult) {
    return;
  }

  const focusPractice = getResultFocusPractice(displayedResult);
  const teacherFeedback = buildTeacherFeedback({
    feedback: displayedResult.feedback,
    focusPractice,
    scoreValue: displayedResult.scoreValue,
    audioSimilarity: displayedResult.audioSimilarity,
  });
  const report = {
    attemptId: displayedResult.attemptId || "",
    canonicalResultJsonPath: displayedResult.resultJsonPath || "",
    targetSentence: displayedResult.targetText || "",
    whisperTranscript: isProviderUsable(displayedResult.whisperStatus) ? displayedResult.bothTranscripts?.whisper || displayedResult.transcript || "" : "",
    appleTranscript: isProviderUsable(displayedResult.appleStatus) ? displayedResult.bothTranscripts?.apple || (displayedResult.sttProvider === "apple" ? displayedResult.transcript : "") || "" : "",
    windowsSpeechTranscript: isProviderUsable(displayedResult.windowsSpeechStatus) ? displayedResult.bothTranscripts?.windows_speech || (displayedResult.sttProvider === "windows_speech" ? displayedResult.transcript : "") || "" : "",
    nativeProvider: getNativeProviderKey(displayedResult),
    nativeTranscript: isProviderUsable(getNativeStatus(displayedResult)) ? getNativeTranscript(displayedResult) : "",
    wordAccuracy: getWordAccuracySummary(displayedResult),
    fluencyTimingScore: getFluencyTimingScore(displayedResult.audioSimilarity),
    focusWord: focusPractice.word || "full sentence",
    focusPhrase: focusPractice.phrase || "",
    teacherFeedback,
    recommendedNextPractice: focusPractice.instruction || displayedResult.suggestion || "",
    whisperStatus: displayedResult.whisperStatus || "",
    whisperNote: displayedResult.whisperNote || "",
    appleStatus: displayedResult.appleStatus || "",
    appleNote: displayedResult.appleNote || "",
    windowsSpeechStatus: displayedResult.windowsSpeechStatus || "",
    windowsSpeechNote: displayedResult.windowsSpeechNote || "",
    audioSimilarity: displayedResult.audioSimilarity || null,
    metrics: displayedResult.metrics || null,
    canonicalResult: displayedResult.resultJson || null,
    rawResult: displayedResult,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${displayedResult.attemptId || `practice-report-attempt-${displayedResult.attemptNumber || "history"}`}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

setStopVisible(false);
setCancelVisible(false);
loadPlatformSettings();
setBenchmarkTargetForLanguage({ force: true });
renderAttempts();
renderPracticeHistory();
loadAttemptsFromDb();
loadMicrophones();

if (navigator.mediaDevices?.addEventListener) {
  navigator.mediaDevices.addEventListener("devicechange", loadMicrophones);
}
