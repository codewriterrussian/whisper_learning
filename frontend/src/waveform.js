export function percentile(sortedValues, ratio) {
  if (!sortedValues.length) {
    return 0;
  }

  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.floor((sortedValues.length - 1) * ratio)));
  return sortedValues[index];
}

export function buildWaveformBuckets(samples, bucketCount) {
  const width = Math.max(1, Math.floor(bucketCount));
  const values = Array.from(samples || [], Number);
  if (!values.length) {
    return { buckets: Array.from({ length: width }, () => 0), rms: 0, quiet: true, scale: 1 };
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const centered = values.map((value) => value - mean);
  const rms = Math.sqrt(centered.reduce((sum, value) => sum + value * value, 0) / centered.length);
  const samplesPerBucket = Math.max(1, Math.ceil(centered.length / width));
  const rawPeaks = [];

  for (let bucket = 0; bucket < width; bucket += 1) {
    const start = bucket * samplesPerBucket;
    const end = Math.min(start + samplesPerBucket, centered.length);
    let peak = 0;

    for (let index = start; index < end; index += 1) {
      peak = Math.max(peak, Math.abs(centered[index]));
    }

    rawPeaks.push(peak);
  }

  const nonZeroPeaks = rawPeaks.filter((value) => value > 0).sort((a, b) => a - b);
  const robustPeak = percentile(nonZeroPeaks, 0.95) || Math.max(...rawPeaks, 1);
  const scale = Math.max(robustPeak, rms * 2.5, 0.015);
  const buckets = rawPeaks.map((peak) => Math.min(1, peak / scale));

  return {
    buckets,
    rms,
    quiet: rms > 0 && rms < 0.012,
    scale,
  };
}

export function monoSamplesFromAudioBuffer(audioBuffer) {
  const channelCount = audioBuffer.numberOfChannels || 1;
  const length = audioBuffer.length;
  const mono = new Float32Array(length);

  for (let channel = 0; channel < channelCount; channel += 1) {
    const data = audioBuffer.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      mono[index] += data[index] / channelCount;
    }
  }

  return mono;
}
