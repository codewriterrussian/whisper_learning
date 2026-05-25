import assert from "node:assert/strict";
import test from "node:test";

import {
  BENCHMARK_TARGET_LANGUAGE_HINTS,
  inferLanguageFromTargetText,
  validateKnownTargetLanguageHints,
} from "./language_metadata.js";

test("Vietnamese benchmark target is hinted as Vietnamese", () => {
  const sentence = "Hôm nay tôi luyện nói rõ ràng, chậm rãi và có nhịp điệu tự nhiên.";

  assert.equal(BENCHMARK_TARGET_LANGUAGE_HINTS[sentence], "vi");
  assert.equal(inferLanguageFromTargetText(sentence), "vi");
});

test("known benchmark target language hints match their sentence language", () => {
  assert.deepEqual(validateKnownTargetLanguageHints(), []);

  assert.equal(inferLanguageFromTargetText("Today I will practice speaking clearly, slowly, and with natural rhythm."), "en");
  assert.equal(inferLanguageFromTargetText("Heute übe ich deutliches Sprechen, langsames Tempo und natürlichen Rhythmus."), "de");
  assert.equal(inferLanguageFromTargetText("Vandaag oefen ik duidelijk spreken, rustig tempo en natuurlijk ritme."), "nl");
  assert.equal(inferLanguageFromTargetText("Dzisiaj ćwiczę wyraźną wymowę, spokojne tempo i naturalny rytm."), "pl");
  assert.equal(inferLanguageFromTargetText("Сегодня я тренирую четкую речь, спокойный темп и естественный ритм."), "ru");
  assert.equal(inferLanguageFromTargetText("今日は、はっきり、ゆっくり、自然なリズムで話す練習をします。"), "ja");
});
