import assert from "node:assert/strict";
import test from "node:test";

import { buildWaveformBuckets } from "./src/waveform.js";

test("waveform normalization is not flattened by one large initial spike", () => {
  const samples = new Float32Array(1000);
  samples[0] = 1;
  for (let index = 1; index < samples.length; index += 1) {
    samples[index] = Math.sin(index / 8) * 0.08;
  }

  const result = buildWaveformBuckets(samples, 100);
  const laterVisibleBuckets = result.buckets.slice(10).filter((value) => value > 0.25);

  assert.ok(laterVisibleBuckets.length > 20);
  assert.ok(result.buckets[0] <= 1);
});

test("waveform normalization removes DC offset", () => {
  const samples = new Float32Array(400).fill(0.35);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] += Math.sin(index / 4) * 0.04;
  }

  const result = buildWaveformBuckets(samples, 80);

  assert.ok(result.rms < 0.05);
  assert.ok(result.buckets.some((value) => value > 0.2));
});

test("quiet valid audio still has visible variation and quiet flag", () => {
  const samples = new Float32Array(800);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.sin(index / 5) * 0.006;
  }

  const result = buildWaveformBuckets(samples, 80);

  assert.equal(result.quiet, true);
  assert.ok(result.buckets.some((value) => value > 0.2));
});
