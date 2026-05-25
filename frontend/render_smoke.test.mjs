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
  assert.match(mainJs, /Compares OpenAI Whisper with Apple STT/);
});

test("comparison mode defaults are resolved from platform before falling back", () => {
  assert.match(mainJs, /COMPARISON_MODE_STORAGE_KEY = "whisperSpeakingPracticeComparisonMode"/);
  assert.match(mainJs, /darwin: "whisper_apple"/);
  assert.match(mainJs, /win32: "whisper"/);
  assert.match(mainJs, /whisper_apple: "both"/);
  assert.match(mainJs, /both: "whisper_apple"/);
  assert.match(mainJs, /function resolveComparisonMode/);
  assert.match(mainJs, /function normalizeSavedComparisonMode/);
  assert.match(mainJs, /normalizedSavedComparisonMode && availableModes\.has\(normalizedSavedComparisonMode\)/);
  assert.match(mainJs, /localStorage\.setItem\(COMPARISON_MODE_STORAGE_KEY, sttProviderEl\.value\)/);
  assert.match(mainJs, /formData\.append\("sttProvider", getBackendProviderForComparisonMode\(sttProviderEl\.value\)\)/);
  assert.match(mainJs, /formData\.append\("comparisonMode", sttProviderEl\.value\)/);
  assert.match(mainJs, /function getWhisperModelForRequest/);
  assert.match(mainJs, /formData\.append\("whisperModel", requestWhisperModel\)/);
  assert.match(mainJs, /detectedPlatform/);
  assert.match(mainJs, /resolvedDefaultComparisonMode/);
  assert.match(mainJs, /activeComparisonMode/);
});

test("processing device UI uses backend recommendation unless user selected a device", () => {
  assert.match(html, /id="whisperDeviceField"/);
  assert.match(mainJs, /api\/config/);
  assert.match(mainJs, /api\/stt-warmup/);
  assert.match(mainJs, /PROCESSING_DEVICE_STORAGE_KEY = "whisperSpeakingPracticeProcessingDevice"/);
  assert.match(mainJs, /PROCESSING_DEVICE_USER_SELECTED_STORAGE_KEY = "whisperSpeakingPracticeProcessingDeviceUserSelected"/);
  assert.match(mainJs, /localStorage\.getItem\(PROCESSING_DEVICE_USER_SELECTED_STORAGE_KEY\) === "1"/);
  assert.match(mainJs, /localStorage\.removeItem\(PROCESSING_DEVICE_STORAGE_KEY\)/);
  assert.match(mainJs, /frontend processing device initialized from backend recommendation/);
  assert.match(mainJs, /frontend processing device initialized from user preference/);
  assert.match(mainJs, /formData\.append\("whisperDevice", requestWhisperDevice\)/);
  assert.match(mainJs, /requestWhisperWarmup\("processing device changed"\)/);
  assert.match(mainJs, /requestWhisperWarmup\("check mode changed"\)/);
});

test("result UI explains deterministic provider scoring", () => {
  assert.match(mainJs, /Score from:/);
  assert.match(mainJs, /selectedScoringProvider/);
  assert.match(mainJs, /low confidence and was not scored/);
});

test("Apple STT permission abort is visible and non-fatal in result UI", () => {
  assert.match(html, /id="applePermissionWarning"/);
  assert.match(html, /Whisper succeeded, but Apple STT was blocked by macOS Speech Recognition permission/);
  assert.match(mainJs, /function isAppleSpeechPermissionIssue/);
  assert.match(mainJs, /apple speech helper was aborted by macos/);
  assert.match(mainJs, /isProviderUsable\(result\.whisperStatus\)/);
  assert.match(mainJs, /applePermissionWarningEl\.hidden = !showApplePermissionWarning/);
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

test("language debug metadata is displayed in developer details", () => {
  for (const id of [
    "debugSentenceText",
    "debugTargetLanguageHint",
    "debugSelectedLanguage",
    "debugFinalSttLanguage",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }

  assert.match(mainJs, /targetLanguageHint/);
  assert.match(mainJs, /selectedLanguage/);
  assert.match(mainJs, /finalSttLanguage/);
  assert.match(mainJs, /languageDebug/);
});

test("beginner system check and simple mode UI are wired", () => {
  assert.match(html, /id="systemCheckBtn"/);
  assert.match(html, /id="simpleAccuracyMode"/);
  assert.match(html, /id="simpleNativeComparison"/);
  assert.match(html, /id="firstLaunchGuide"/);
  assert.match(mainJs, /api\/system-check/);
  assert.match(mainJs, /function applySimpleSettings/);
  assert.match(mainJs, /function initializeBeginnerUi/);
  assert.match(mainJs, /OpenAI Whisper remains the main scorer/);
  assert.doesNotMatch(mainJs, /Whisper retried on CPU because Apple Silicon MPS failed for this model/);
});
