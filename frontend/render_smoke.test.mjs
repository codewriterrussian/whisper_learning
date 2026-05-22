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
  assert.match(mainJs, /windows_speech/);
  assert.match(mainJs, /getNativeProviderLabel/);
  assert.match(mainJs, /getProviderModeLabel/);
  assert.match(mainJs, /Whisper not used in this mode/);
});

test("result UI explains deterministic provider scoring", () => {
  assert.match(mainJs, /Score from:/);
  assert.match(mainJs, /selectedScoringProvider/);
  assert.match(mainJs, /low confidence and was not scored/);
  assert.match(mainJs, /Windows Speech did not return a transcript/);
});

test("clear local data UI is wired", () => {
  assert.match(html, /id="clearLocalDataBtn"/);
  assert.match(mainJs, /api\/local-data/);
});
