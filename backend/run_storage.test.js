import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";

import { buildCanonicalResult, buildRunPaths, createAttemptId } from "./run_storage.js";

test("two attempt IDs produce separate run folders", () => {
  const root = "/tmp/whisper_learning_test";
  const firstAttemptId = createAttemptId();
  const secondAttemptId = createAttemptId();
  const firstPaths = buildRunPaths(root, firstAttemptId);
  const secondPaths = buildRunPaths(root, secondAttemptId);

  assert.notEqual(firstAttemptId, secondAttemptId);
  assert.notEqual(firstPaths.runDir, secondPaths.runDir);
  assert.equal(firstPaths.transcriptPath, path.join(root, "runs", firstAttemptId, "transcript.txt"));
  assert.equal(secondPaths.transcriptPath, path.join(root, "runs", secondAttemptId, "transcript.txt"));
});

test("transcripts are saved under separate attempt folders", () => {
  const root = "/tmp/whisper_learning_test";
  const firstPaths = buildRunPaths(root, "attempt-a");
  const secondPaths = buildRunPaths(root, "attempt-b");

  assert.equal(firstPaths.whisperTranscriptPath, path.join(root, "runs", "attempt-a", "transcript.whisper.txt"));
  assert.equal(firstPaths.appleTranscriptPath, path.join(root, "runs", "attempt-a", "transcript.apple.txt"));
  assert.equal(firstPaths.windowsSpeechTranscriptPath, path.join(root, "runs", "attempt-a", "transcript.windows_speech.txt"));
  assert.equal(firstPaths.colabWhisperTranscriptPath, path.join(root, "runs", "attempt-a", "transcript.colab_whisper.txt"));
  assert.equal(firstPaths.providerTranscriptsJsonPath, path.join(root, "runs", "attempt-a", "provider_transcripts.json"));
  assert.equal(firstPaths.scoringResultJsonPath, path.join(root, "runs", "attempt-a", "scoring_result.json"));
  assert.equal(firstPaths.timingJsonPath, path.join(root, "runs", "attempt-a", "timing.json"));
  assert.equal(secondPaths.whisperTranscriptPath, path.join(root, "runs", "attempt-b", "transcript.whisper.txt"));
  assert.equal(secondPaths.appleTranscriptPath, path.join(root, "runs", "attempt-b", "transcript.apple.txt"));
  assert.equal(secondPaths.windowsSpeechTranscriptPath, path.join(root, "runs", "attempt-b", "transcript.windows_speech.txt"));
  assert.equal(secondPaths.colabWhisperTranscriptPath, path.join(root, "runs", "attempt-b", "transcript.colab_whisper.txt"));
});

test("result JSON contains provider statuses and timing", () => {
  const root = "/tmp/whisper_learning_test";
  const paths = buildRunPaths(root, "attempt-a");
  const result = buildCanonicalResult({
    root,
    paths,
    attemptId: "attempt-a",
    createdAt: "2026-05-20T00:00:00.000Z",
    language: "pl",
    targetText: "Dzisiaj cwicze.",
    whisperModel: "large-v3-turbo",
    whisperDevice: "mps",
    sttProvider: "both",
    providerMode: "both",
    requestedProvider: "whisper+apple",
    attemptedProviders: ["whisper", "apple"],
    selectedScoringProvider: "whisper",
    fallbackUsed: false,
    fallbackReason: "",
    nativeProvider: "apple",
    whisperStatus: "ok",
    appleStatus: "ok",
    windowsSpeechStatus: "skipped",
    colabWhisperStatus: "skipped",
    whisperNote: "",
    appleNote: "",
    windowsSpeechNote: "",
    colabWhisperNote: "",
    providerTranscripts: { whisper: "Dzisiaj cwicze.", apple: "Dzisiaj cwicze.", windows_speech: "", colab_whisper: "" },
    providerScores: { whisper: "100.0/100", apple: "100.0/100", windows_speech: "--", colab_whisper: "--" },
    structuredProviderResults: {
      whisper: {
        status: "ok",
        rawTranscript: "Dzisiaj cwicze.",
        normalizedTranscript: "dzisiaj cwicze",
        score: "100.0/100",
        invalidReason: "",
        timingMs: 1200,
      },
      apple: {
        status: "ok",
        rawTranscript: "Dzisiaj cwicze.",
        normalizedTranscript: "dzisiaj cwicze",
        score: "100.0/100",
        invalidReason: "",
        timingMs: 800,
      },
    },
    audioSimilarity: { status: "ok", timing_match: 90 },
    focusWord: "",
    teacherFeedback: "Good.",
    timingBreakdown: { whisperTranscription: 1200, appleStt: 800, total: 1500 },
  });

  assert.equal(result.attemptId, "attempt-a");
  assert.equal(result.providerStatuses.whisper, "ok");
  assert.equal(result.providerStatuses.apple, "ok");
  assert.equal(result.providerStatuses.windows_speech, "skipped");
  assert.equal(result.providerStatuses.colab_whisper, "skipped");
  assert.equal(result.providerMode, "both");
  assert.equal(result.requestedProvider, "whisper+apple");
  assert.deepEqual(result.attemptedProviders, ["whisper", "apple"]);
  assert.equal(result.selectedScoringProvider, "whisper");
  assert.equal(result.fallbackUsed, false);
  assert.equal(result.providers.whisper.status, "ok");
  assert.equal(result.providers.whisper.rawTranscript, "Dzisiaj cwicze.");
  assert.equal(result.providers.whisper.normalizedTranscript, "dzisiaj cwicze");
  assert.equal(result.providers.whisper.timingMs, 1200);
  assert.equal(result.providers.windows_speech.status, "skipped");
  assert.equal(result.timingBreakdown.total, 1500);
  assert.equal(result.files.resultJson, path.join("runs", "attempt-a", "result.json"));
  assert.equal(result.files.providerTranscriptsJson, path.join("runs", "attempt-a", "provider_transcripts.json"));
  assert.equal(result.files.scoringResultJson, path.join("runs", "attempt-a", "scoring_result.json"));
  assert.equal(result.files.timingJson, path.join("runs", "attempt-a", "timing.json"));
  assert.equal(result.files.colabWhisperTranscript, path.join("runs", "attempt-a", "transcript.colab_whisper.txt"));
});

test("history summary can point to the correct attempt ID", () => {
  const root = "/tmp/whisper_learning_test";
  const paths = buildRunPaths(root, "attempt-history");
  const result = buildCanonicalResult({
    root,
    paths,
    attemptId: "attempt-history",
    createdAt: "2026-05-20T00:00:00.000Z",
    language: "vi",
    targetText: "Hom nay toi luyen noi.",
    whisperModel: "large",
    whisperDevice: "mps",
    sttProvider: "whisper",
    providerMode: "whisper",
    nativeProvider: "",
    whisperStatus: "ok",
    appleStatus: "skipped",
    windowsSpeechStatus: "skipped",
    colabWhisperStatus: "skipped",
    whisperNote: "",
    appleNote: "",
    windowsSpeechNote: "",
    colabWhisperNote: "",
    providerTranscripts: { whisper: "Hom nay toi luyen noi.", apple: "", windows_speech: "", colab_whisper: "" },
    providerScores: { whisper: "100.0/100", apple: "--", windows_speech: "--", colab_whisper: "--" },
    audioSimilarity: { status: "ok" },
    focusWord: "",
    teacherFeedback: "Good.",
    timingBreakdown: { total: 1000 },
  });
  const historySummary = {
    attemptId: result.attemptId,
    resultJsonPath: result.files.resultJson,
    whisperStatus: result.providerStatuses.whisper,
    appleStatus: result.providerStatuses.apple,
    windowsSpeechStatus: result.providerStatuses.windows_speech,
    colabWhisperStatus: result.providerStatuses.colab_whisper,
    providerMode: result.providerMode,
  };

  assert.equal(historySummary.attemptId, "attempt-history");
  assert.equal(historySummary.resultJsonPath, path.join("runs", "attempt-history", "result.json"));
});

test("Windows Speech only stores provider mode and skipped Whisper is not scored", () => {
  const root = "/tmp/whisper_learning_test";
  const paths = buildRunPaths(root, "attempt-windows");
  const result = buildCanonicalResult({
    root,
    paths,
    attemptId: "attempt-windows",
    createdAt: "2026-05-20T00:00:00.000Z",
    language: "en",
    targetText: "Today I will practice.",
    whisperModel: "large",
    whisperDevice: "auto",
    sttProvider: "windows_speech",
    providerMode: "windows_speech",
    requestedProvider: "windows",
    attemptedProviders: ["windows_speech"],
    selectedScoringProvider: "windows_speech",
    fallbackUsed: false,
    fallbackReason: "",
    nativeProvider: "windows_speech",
    whisperStatus: "skipped",
    appleStatus: "skipped",
    windowsSpeechStatus: "ok",
    colabWhisperStatus: "skipped",
    whisperNote: "",
    appleNote: "",
    windowsSpeechNote: "",
    colabWhisperNote: "",
    providerTranscripts: { whisper: "", apple: "", windows_speech: "Today I will practice.", colab_whisper: "" },
    providerScores: { whisper: "--", apple: "--", windows_speech: "100.0/100", colab_whisper: "--" },
    structuredProviderResults: {
      windows_speech: {
        status: "ok",
        rawTranscript: "Today I will practice.",
        normalizedTranscript: "today i will practice",
        score: "100.0/100",
        invalidReason: "",
        timingMs: 900,
      },
      windows: {
        status: "ok",
        rawTranscript: "Today I will practice.",
        normalizedTranscript: "today i will practice",
        score: "100.0/100",
        invalidReason: "",
        timingMs: 900,
      },
    },
    audioSimilarity: { status: "ok" },
    focusWord: "",
    teacherFeedback: "Good.",
    timingBreakdown: { total: 1000 },
  });

  assert.equal(result.providerMode, "windows_speech");
  assert.equal(result.requestedProvider, "windows");
  assert.deepEqual(result.attemptedProviders, ["windows_speech"]);
  assert.equal(result.selectedScoringProvider, "windows_speech");
  assert.equal(result.fallbackUsed, false);
  assert.equal(result.providers.whisper.status, "skipped");
  assert.equal(result.providers.whisper.score, "--");
  assert.equal(result.providers.windows_speech.status, "ok");
  assert.equal(result.providers.windows_speech.score, "100.0/100");
  assert.equal(result.providerResults.windows_speech.rawTranscript, "Today I will practice.");
  assert.equal(result.providerResults.windows.rawTranscript, "Today I will practice.");
});

test("low-confidence Windows result keeps raw transcript but no normal score", () => {
  const root = "/tmp/whisper_learning_test";
  const paths = buildRunPaths(root, "attempt-low-confidence");
  const result = buildCanonicalResult({
    root,
    paths,
    attemptId: "attempt-low-confidence",
    createdAt: "2026-05-20T00:00:00.000Z",
    language: "en",
    targetText: "Today I will practice speaking clearly slowly and with natural rhythm.",
    whisperModel: "large",
    whisperDevice: "auto",
    sttProvider: "windows_speech",
    providerMode: "windows_speech",
    requestedProvider: "windows",
    attemptedProviders: ["windows_speech"],
    selectedScoringProvider: "",
    fallbackUsed: false,
    fallbackReason: "",
    nativeProvider: "windows_speech",
    whisperStatus: "skipped",
    appleStatus: "skipped",
    windowsSpeechStatus: "low_confidence",
    colabWhisperStatus: "skipped",
    whisperNote: "",
    appleNote: "",
    windowsSpeechNote: "low_word_overlap (1/7)",
    colabWhisperNote: "",
    providerTranscripts: { whisper: "", apple: "", windows_speech: "", colab_whisper: "" },
    providerScores: { whisper: "--", apple: "--", windows_speech: "--", colab_whisper: "--" },
    structuredProviderResults: {
      windows_speech: {
        status: "low_confidence",
        rawTranscript: "But then I woke up is speaking charities Dougherty and with",
        normalizedTranscript: "but then i woke up is speaking charities dougherty and with",
        score: "--",
        invalidReason: "low_word_overlap (1/7)",
        timingMs: 900,
      },
    },
    audioSimilarity: { status: "ok" },
    focusWord: "",
    teacherFeedback: "Windows Speech was low confidence.",
    timingBreakdown: { total: 1000 },
  });

  assert.equal(result.selectedScoringProvider, "");
  assert.equal(result.providers.windows_speech.status, "low_confidence");
  assert.equal(result.providers.windows_speech.transcript, "");
  assert.equal(result.providers.windows_speech.rawTranscript, "But then I woke up is speaking charities Dougherty and with");
  assert.equal(result.providers.windows_speech.score, "--");
  assert.equal(result.providers.whisper.status, "skipped");
  assert.equal(result.providers.whisper.score, "--");
});
