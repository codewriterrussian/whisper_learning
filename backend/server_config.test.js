import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const serverSource = readFileSync(new URL("./server.js", import.meta.url), "utf8");

test("server defaults OpenAI Whisper to large-v3-turbo", () => {
  assert.match(serverSource, /const DEFAULT_WHISPER_MODEL = "large-v3-turbo"/);
  assert.match(serverSource, /const DEFAULT_STT_PROVIDER = process\.platform === "darwin" \? "both" : "whisper"/);
  assert.match(serverSource, /normalizeWhisperBackend/);
  assert.match(serverSource, /Faster Whisper has been removed/);
  assert.match(serverSource, /ALLOWED_WHISPER_BACKENDS = new Set\(\["openai", "mlx"\]\)/);
});

test("server recommends MPS only on Apple Silicon and CPU elsewhere", () => {
  assert.match(serverSource, /process\.platform === "darwin" && process\.arch === "arm64"/);
  assert.match(serverSource, /return isAppleSiliconMac\(\) \? "mps" : "cpu"/);
  assert.match(serverSource, /if \(normalized === "mps" && !isAppleSiliconMac\(\)\) \{\n\s+return "cpu"/);
});

test("server exposes config and warmup endpoints", () => {
  assert.match(serverSource, /app\.get\("\/api\/config"/);
  assert.match(serverSource, /recommendedProcessingDevice/);
  assert.match(serverSource, /defaultWhisperBackend/);
  assert.match(serverSource, /defaultWhisperModel/);
  assert.match(serverSource, /appleSttSupported/);
  assert.match(serverSource, /app\.post\("\/api\/stt-warmup"/);
  assert.match(serverSource, /action: "warmup"/);
});
