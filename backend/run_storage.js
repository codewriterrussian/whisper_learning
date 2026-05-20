import path from "path";
import { randomUUID } from "crypto";

export function createAttemptId() {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${timestamp}-${randomUUID()}`;
}

export function buildRunPaths(root, attemptId) {
  const runDir = path.join(root, "runs", attemptId);
  return {
    runDir,
    targetPath: path.join(runDir, "target.txt"),
    originalAudioPath: path.join(runDir, "original.webm"),
    convertedWavPath: path.join(runDir, "input.wav"),
    autoTrimmedWavPath: path.join(runDir, "input.auto_trimmed.wav"),
    transcriptPath: path.join(runDir, "transcript.txt"),
    whisperTranscriptPath: path.join(runDir, "transcript.whisper.txt"),
    appleTranscriptPath: path.join(runDir, "transcript.apple.txt"),
    comparisonPath: path.join(runDir, "comparison.txt"),
    resultJsonPath: path.join(runDir, "result.json"),
  };
}

export function toRootRelative(root, filePath) {
  return path.relative(root, filePath);
}

export function buildCanonicalResult({
  root,
  paths,
  attemptId,
  createdAt,
  language,
  targetText,
  whisperModel,
  whisperDevice,
  sttProvider,
  whisperStatus,
  appleStatus,
  whisperNote,
  appleNote,
  providerTranscripts,
  providerScores,
  audioSimilarity,
  focusWord,
  teacherFeedback,
  timingBreakdown,
}) {
  return {
    attemptId,
    createdAt,
    language,
    targetSentence: targetText,
    selectedModel: whisperModel,
    selectedDevice: whisperDevice,
    sttProvider,
    providerStatuses: {
      whisper: whisperStatus,
      apple: appleStatus,
    },
    providerNotes: {
      whisper: whisperNote,
      apple: appleNote,
    },
    providerTranscripts,
    providerScores,
    fluencyTimingMetrics: audioSimilarity,
    focusWord,
    teacherFeedback,
    timingBreakdown,
    files: {
      originalAudio: toRootRelative(root, paths.originalAudioPath),
      convertedWav: toRootRelative(root, paths.convertedWavPath),
      autoTrimmedWav: toRootRelative(root, paths.autoTrimmedWavPath),
      whisperTranscript: toRootRelative(root, paths.whisperTranscriptPath),
      appleTranscript: toRootRelative(root, paths.appleTranscriptPath),
      comparison: toRootRelative(root, paths.comparisonPath),
      resultJson: toRootRelative(root, paths.resultJsonPath),
    },
  };
}
