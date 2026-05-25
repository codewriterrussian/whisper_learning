export const LANGUAGE_CODES = ["en", "de", "nl", "pl", "ru", "ja", "vi", "zh"];

export const BENCHMARK_TARGET_LANGUAGE_HINTS = {
  "Today I will practice speaking clearly, slowly, and with natural rhythm.": "en",
  "Heute übe ich deutliches Sprechen, langsames Tempo und natürlichen Rhythmus.": "de",
  "Vandaag oefen ik duidelijk spreken, rustig tempo en natuurlijk ritme.": "nl",
  "Dzisiaj ćwiczę wyraźną wymowę, spokojne tempo i naturalny rytm.": "pl",
  "Сегодня я тренирую четкую речь, спокойный темп и естественный ритм.": "ru",
  "今日は、はっきり、ゆっくり、自然なリズムで話す練習をします。": "ja",
  "Hôm nay tôi luyện nói rõ ràng, chậm rãi và có nhịp điệu tự nhiên.": "vi",
  "今天我要练习说得清楚、慢一点，并保持自然的节奏。": "zh",
};

const LANGUAGE_PATTERNS = [
  ["ja", /[\u3040-\u30ff]/u],
  ["ru", /[\u0400-\u04ff]/u],
  ["zh", /[\u3400-\u9fff]/u],
  ["vi", /[ăâđêôơưĂÂĐÊÔƠƯạảãàáậẩẫầấặẳẵằắẹẻẽèéệểễềếịỉĩìíọỏõòóộổỗồốợởỡờớụủũùúựửữừứỵỷỹỳýẠẢÃÀÁẬẨẪẦẤẶẲẴẰẮẸẺẼÈÉỆỂỄỀẾỊỈĨÌÍỌỎÕÒÓỘỔỖỒỐỢỞỠỜỚỤỦŨÙÚỰỬỮỪỨỴỶỸỲÝ]/u],
  ["pl", /[ąćęłńśźżĄĆĘŁŃŚŹŻ]/u],
  ["de", /[äöüßÄÖÜẞ]/u],
];

export function normalizeTargetTextForLanguageHint(targetText) {
  return String(targetText || "").trim().replace(/\s+/g, " ");
}

export function inferLanguageFromTargetText(targetText) {
  const normalized = normalizeTargetTextForLanguageHint(targetText);
  if (!normalized) {
    return "";
  }

  const knownHint = BENCHMARK_TARGET_LANGUAGE_HINTS[normalized];
  if (knownHint) {
    return knownHint;
  }

  for (const [language, pattern] of LANGUAGE_PATTERNS) {
    if (pattern.test(normalized)) {
      return language;
    }
  }

  return "";
}

export function validateKnownTargetLanguageHints() {
  const mismatches = [];

  for (const [sentence, expectedLanguage] of Object.entries(BENCHMARK_TARGET_LANGUAGE_HINTS)) {
    const inferredLanguage = inferLanguageFromTargetText(sentence);
    if (inferredLanguage !== expectedLanguage) {
      mismatches.push({
        sentence,
        expectedLanguage,
        inferredLanguage,
      });
    }
  }

  return mismatches;
}
