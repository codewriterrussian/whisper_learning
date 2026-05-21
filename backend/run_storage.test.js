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
  assert.equal(secondPaths.whisperTranscriptPath, path.join(root, "runs", "attempt-b", "transcript.whisper.txt"));
  assert.equal(secondPaths.appleTranscriptPath, path.join(root, "runs", "attempt-b", "transcript.apple.txt"));
  assert.equal(secondPaths.windowsSpeechTranscriptPath, path.join(root, "runs", "attempt-b", "transcript.windows_speech.txt"));
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
    nativeProvider: "apple",
    whisperStatus: "ok",
    appleStatus: "ok",
    windowsSpeechStatus: "skipped",
    whisperNote: "",
    appleNote: "",
    windowsSpeechNote: "",
    providerTranscripts: { whisper: "Dzisiaj cwicze.", apple: "Dzisiaj cwicze.", windows_speech: "" },
    providerScores: { whisper: "100.0/100", apple: "100.0/100", windows_speech: "--" },
    audioSimilarity: { status: "ok", timing_match: 90 },
    focusWord: "",
    teacherFeedback: "Good.",
    timingBreakdown: { whisperTranscription: 1200, appleStt: 800, total: 1500 },
  });

  assert.equal(result.attemptId, "attempt-a");
  assert.equal(result.providerStatuses.whisper, "ok");
  assert.equal(result.providerStatuses.apple, "ok");
  assert.equal(result.providerStatuses.windows_speech, "skipped");
  assert.equal(result.timingBreakdown.total, 1500);
  assert.equal(result.files.resultJson, path.join("runs", "attempt-a", "result.json"));
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
    nativeProvider: "",
    whisperStatus: "ok",
    appleStatus: "skipped",
    windowsSpeechStatus: "skipped",
    whisperNote: "",
    appleNote: "",
    windowsSpeechNote: "",
    providerTranscripts: { whisper: "Hom nay toi luyen noi.", apple: "", windows_speech: "" },
    providerScores: { whisper: "100.0/100", apple: "--", windows_speech: "--" },
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
  };

  assert.equal(historySummary.attemptId, "attempt-history");
  assert.equal(historySummary.resultJsonPath, path.join("runs", "attempt-history", "result.json"));
});
