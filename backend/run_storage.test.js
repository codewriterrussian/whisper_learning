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
  assert.equal(firstPaths.colabWhisperTranscriptPath, path.join(root, "runs", "attempt-a", "transcript.colab_whisper.txt"));
  assert.equal(firstPaths.providerTranscriptsJsonPath, path.join(root, "runs", "attempt-a", "provider_transcripts.json"));
  assert.equal(firstPaths.scoringResultJsonPath, path.join(root, "runs", "attempt-a", "scoring_result.json"));
  assert.equal(firstPaths.timingJsonPath, path.join(root, "runs", "attempt-a", "timing.json"));
  assert.equal(secondPaths.whisperTranscriptPath, path.join(root, "runs", "attempt-b", "transcript.whisper.txt"));
  assert.equal(secondPaths.appleTranscriptPath, path.join(root, "runs", "attempt-b", "transcript.apple.txt"));
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
    colabWhisperStatus: "skipped",
    whisperNote: "",
    appleNote: "",
    colabWhisperNote: "",
    providerTranscripts: { whisper: "Dzisiaj cwicze.", apple: "Dzisiaj cwicze.", colab_whisper: "" },
    providerScores: { whisper: "100.0/100", apple: "100.0/100", colab_whisper: "--" },
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
  assert.deepEqual(Object.keys(result.providers), ["whisper", "apple", "colab_whisper"]);
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
    colabWhisperStatus: "skipped",
    whisperNote: "",
    appleNote: "",
    colabWhisperNote: "",
    providerTranscripts: { whisper: "Hom nay toi luyen noi.", apple: "", colab_whisper: "" },
    providerScores: { whisper: "100.0/100", apple: "--", colab_whisper: "--" },
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
    colabWhisperStatus: result.providerStatuses.colab_whisper,
    providerMode: result.providerMode,
  };

  assert.equal(historySummary.attemptId, "attempt-history");
  assert.equal(historySummary.resultJsonPath, path.join("runs", "attempt-history", "result.json"));
});
