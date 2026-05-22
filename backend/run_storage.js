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
    providerTranscriptsJsonPath: path.join(runDir, "provider_transcripts.json"),
    scoringResultJsonPath: path.join(runDir, "scoring_result.json"),
    timingJsonPath: path.join(runDir, "timing.json"),
    transcriptPath: path.join(runDir, "transcript.txt"),
    whisperTranscriptPath: path.join(runDir, "transcript.whisper.txt"),
    appleTranscriptPath: path.join(runDir, "transcript.apple.txt"),
    colabWhisperTranscriptPath: path.join(runDir, "transcript.colab_whisper.txt"),
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
  providerMode = sttProvider,
  requestedProvider = sttProvider,
  attemptedProviders = [],
  selectedScoringProvider = "",
  fallbackUsed = false,
  fallbackReason = "",
  structuredProviderResults = {},
  whisperStatus,
  appleStatus,
  colabWhisperStatus = "skipped",
  whisperNote,
  appleNote,
  colabWhisperNote = "",
  nativeProvider = "",
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
    providerMode,
    requestedProvider,
    attemptedProviders,
    selectedScoringProvider,
    fallbackUsed,
    fallbackReason,
    nativeProvider,
    platform: process.platform,
    providerStatuses: {
      whisper: whisperStatus,
      apple: appleStatus,
      colab_whisper: colabWhisperStatus,
    },
    providerNotes: {
      whisper: whisperNote,
      apple: appleNote,
      colab_whisper: colabWhisperNote,
    },
    providers: {
      whisper: {
        status: whisperStatus,
        rawTranscript: structuredProviderResults?.whisper?.rawTranscript ?? providerTranscripts?.whisper ?? "",
        normalizedTranscript: structuredProviderResults?.whisper?.normalizedTranscript || "",
        transcript: providerTranscripts?.whisper || "",
        score: structuredProviderResults?.whisper?.score ?? providerScores?.whisper ?? "--",
        invalidReason: structuredProviderResults?.whisper?.invalidReason || whisperNote || "",
        timingMs: structuredProviderResults?.whisper?.timingMs || 0,
        note: whisperNote || "",
      },
      apple: {
        status: appleStatus,
        rawTranscript: structuredProviderResults?.apple?.rawTranscript ?? providerTranscripts?.apple ?? "",
        normalizedTranscript: structuredProviderResults?.apple?.normalizedTranscript || "",
        transcript: providerTranscripts?.apple || "",
        score: structuredProviderResults?.apple?.score ?? providerScores?.apple ?? "--",
        invalidReason: structuredProviderResults?.apple?.invalidReason || appleNote || "",
        timingMs: structuredProviderResults?.apple?.timingMs || 0,
        note: appleNote || "",
      },
      colab_whisper: {
        status: colabWhisperStatus,
        rawTranscript: structuredProviderResults?.colab_whisper?.rawTranscript ?? providerTranscripts?.colab_whisper ?? "",
        normalizedTranscript: structuredProviderResults?.colab_whisper?.normalizedTranscript || "",
        transcript: providerTranscripts?.colab_whisper || "",
        score: structuredProviderResults?.colab_whisper?.score ?? providerScores?.colab_whisper ?? "--",
        invalidReason: structuredProviderResults?.colab_whisper?.invalidReason || colabWhisperNote || "",
        timingMs: structuredProviderResults?.colab_whisper?.timingMs || 0,
        note: colabWhisperNote || "",
      },
    },
    providerResults: structuredProviderResults,
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
      providerTranscriptsJson: toRootRelative(root, paths.providerTranscriptsJsonPath),
      scoringResultJson: toRootRelative(root, paths.scoringResultJsonPath),
      timingJson: toRootRelative(root, paths.timingJsonPath),
      whisperTranscript: toRootRelative(root, paths.whisperTranscriptPath),
      appleTranscript: toRootRelative(root, paths.appleTranscriptPath),
      colabWhisperTranscript: toRootRelative(root, paths.colabWhisperTranscriptPath),
      comparison: toRootRelative(root, paths.comparisonPath),
      resultJson: toRootRelative(root, paths.resultJsonPath),
    },
  };
}
