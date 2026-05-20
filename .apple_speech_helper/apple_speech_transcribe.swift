
import Foundation
import Speech

let args = CommandLine.arguments
guard args.count >= 3 else {
    fputs("Usage: apple_speech_transcribe <audio.wav> <locale>\n", stderr)
    exit(2)
}

let audioURL = URL(fileURLWithPath: args[1])
let localeIdentifier = args[2]
let recognizer = SFSpeechRecognizer(locale: Locale(identifier: localeIdentifier))
guard let recognizer = recognizer, recognizer.isAvailable else {
    fputs("Apple Speech recognizer is unavailable for locale \(localeIdentifier). Check macOS Speech Recognition permissions or try another language.\n", stderr)
    exit(3)
}

let semaphore = DispatchSemaphore(value: 0)
var isDone = false
var transcript = ""
var failure: String?
var task: SFSpeechRecognitionTask?

SFSpeechRecognizer.requestAuthorization { status in
    guard status == .authorized else {
        failure = "Apple Speech permission was not authorized. Enable Speech Recognition permission in macOS Settings."
        isDone = true
        return
    }

    let request = SFSpeechURLRecognitionRequest(url: audioURL)
    request.shouldReportPartialResults = false

    task = recognizer.recognitionTask(with: request) { result, error in
        if let result = result {
            transcript = result.bestTranscription.formattedString
        }
        if let error = error {
            failure = error.localizedDescription
            isDone = true
            return
        }
        if result?.isFinal == true {
            isDone = true
        }
    }
}

let deadline = Date().addingTimeInterval(45)
while !isDone && Date() < deadline {
    RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.1))
}

task?.cancel()

if !isDone {
    fputs("Apple Speech transcription timed out.\n", stderr)
    exit(4)
}

if let failure = failure {
    fputs("\(failure)\n", stderr)
    exit(5)
}

print(transcript)
