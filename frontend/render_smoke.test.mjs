import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const mainJs = readFileSync(new URL("./src/main.js", import.meta.url), "utf8");

test("result panel has the checking progress and final result anchors", () => {
  for (const id of [
    "checkingProgressPanel",
    "practiceResultContent",
    "overallScore",
    "providerModeResult",
    "fluencyScoreSummary",
    "transcriptResult",
    "appleTranscriptCard",
    "nativeTranscriptLabel",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test("settings are platform-aware in frontend source", () => {
  assert.match(mainJs, /api\/bootstrap/);
  assert.match(mainJs, /getNativeProviderLabel/);
  assert.match(mainJs, /getProviderModeLabel/);
  assert.match(mainJs, /Whisper not used in this mode/);
  assert.match(mainJs, /Mode: Whisper \+ Apple STT/);
});

test("comparison mode defaults are resolved from platform before falling back", () => {
  assert.match(mainJs, /COMPARISON_MODE_STORAGE_KEY = "whisperSpeakingPracticeComparisonMode"/);
  assert.match(mainJs, /darwin: "whisper_apple"/);
  assert.match(mainJs, /win32: "whisper"/);
  assert.match(mainJs, /whisper_apple: "both"/);
  assert.match(mainJs, /both: "whisper_apple"/);
  assert.match(mainJs, /function resolveComparisonMode/);
  assert.match(mainJs, /savedComparisonMode && availableModes\.has\(savedComparisonMode\)/);
  assert.match(mainJs, /localStorage\.setItem\(COMPARISON_MODE_STORAGE_KEY, sttProviderEl\.value\)/);
  assert.match(mainJs, /formData\.append\("sttProvider", getBackendProviderForComparisonMode\(sttProviderEl\.value\)\)/);
  assert.match(mainJs, /detectedPlatform/);
  assert.match(mainJs, /resolvedDefaultComparisonMode/);
  assert.match(mainJs, /activeComparisonMode/);
});

test("result UI explains deterministic provider scoring", () => {
  assert.match(mainJs, /Score from:/);
  assert.match(mainJs, /selectedScoringProvider/);
  assert.match(mainJs, /low confidence and was not scored/);
});

test("learner UI hides developer details and blocks mismatched attempt comparisons", () => {
  assert.match(html, /Advanced \/ Developer Details/);
  assert.match(html, /id="stickySelectionStatus"/);
  assert.match(mainJs, /These attempts use different target sentences or languages/);
  assert.match(mainJs, /canCompareAttempts/);
  assert.match(mainJs, /getScoreSummaryLine/);
});

test("clear local data UI is wired", () => {
  assert.match(html, /id="clearLocalDataBtn"/);
  assert.match(mainJs, /api\/local-data/);
});

test("beginner system check and simple mode UI are wired", () => {
  assert.match(html, /id="systemCheckBtn"/);
  assert.match(html, /id="simpleAccuracyMode"/);
  assert.match(html, /id="simpleNativeComparison"/);
  assert.match(html, /id="firstLaunchGuide"/);
  assert.match(mainJs, /api\/system-check/);
  assert.match(mainJs, /function applySimpleSettings/);
  assert.match(mainJs, /function initializeBeginnerUi/);
});
