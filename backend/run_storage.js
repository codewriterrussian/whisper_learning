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
    windowsSpeechTranscriptPath: path.join(runDir, "transcript.windows_speech.txt"),
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
  whisperStatus,
  appleStatus,
  windowsSpeechStatus = "skipped",
  colabWhisperStatus = "skipped",
  whisperNote,
  appleNote,
  windowsSpeechNote = "",
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
    nativeProvider,
    platform: process.platform,
    providerStatuses: {
      whisper: whisperStatus,
      apple: appleStatus,
      windows_speech: windowsSpeechStatus,
      colab_whisper: colabWhisperStatus,
    },
    providerNotes: {
      whisper: whisperNote,
      apple: appleNote,
      windows_speech: windowsSpeechNote,
      colab_whisper: colabWhisperNote,
    },
    providers: {
      whisper: {
        status: whisperStatus,
        transcript: providerTranscripts?.whisper || "",
        score: providerScores?.whisper || "--",
        note: whisperNote || "",
      },
      apple: {
        status: appleStatus,
        transcript: providerTranscripts?.apple || "",
        score: providerScores?.apple || "--",
        note: appleNote || "",
      },
      windows_speech: {
        status: windowsSpeechStatus,
        transcript: providerTranscripts?.windows_speech || "",
        score: providerScores?.windows_speech || "--",
        note: windowsSpeechNote || "",
      },
      colab_whisper: {
        status: colabWhisperStatus,
        transcript: providerTranscripts?.colab_whisper || "",
        score: providerScores?.colab_whisper || "--",
        note: colabWhisperNote || "",
      },
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
      windowsSpeechTranscript: toRootRelative(root, paths.windowsSpeechTranscriptPath),
      colabWhisperTranscript: toRootRelative(root, paths.colabWhisperTranscriptPath),
      comparison: toRootRelative(root, paths.comparisonPath),
      resultJson: toRootRelative(root, paths.resultJsonPath),
    },
  };
}
