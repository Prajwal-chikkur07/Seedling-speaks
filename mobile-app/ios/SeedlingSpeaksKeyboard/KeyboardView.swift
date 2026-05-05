import SwiftUI
import AVFoundation

// MARK: - Tone Model

enum ToneOption: String, CaseIterable {
    case formal = "Formal"
    case casual = "Casual"
    case professional = "Professional"

    var icon: String {
        switch self {
        case .formal: return "👔"
        case .casual: return "☕"
        case .professional: return "💼"
        }
    }
}

// MARK: - Recording State

enum RecordingState {
    case idle
    case recording
    case processing

    var label: String {
        switch self {
        case .idle: return "Press to Speak"
        case .recording: return "Listening..."
        case .processing: return "Translating..."
        }
    }

    var color: Color {
        switch self {
        case .idle: return Color(red: 0.91, green: 0.51, blue: 0.05)  // Saffron
        case .recording: return .red
        case .processing: return .gray
        }
    }
}

// MARK: - Keyboard View

struct KeyboardView: View {

    let insertText: (String) -> Void
    let deleteBackward: () -> Void
    let switchKeyboard: () -> Void
    let hasFullAccess: Bool

    @State private var selectedTone: ToneOption = .casual
    @State private var recordingState: RecordingState = .idle
    @State private var audioRecorder: AVAudioRecorder?
    @State private var errorMessage: String?
    @State private var pulseAnimation = false

    // SeedlingSpeaks brand colors
    private let saffron = Color(red: 0.91, green: 0.51, blue: 0.05)
    private let bgColor = Color(red: 0.96, green: 0.94, blue: 0.91)
    private let surfaceColor = Color(red: 0.99, green: 0.98, blue: 0.96)

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            VStack(spacing: 0) {
                if !hasFullAccess {
                    fullAccessWarning
                } else {
                    toneSelector
                    Spacer(minLength: 12)
                    microphoneButton
                    Spacer(minLength: 12)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)

            // Tiny globe to switch keyboards (Apple requires this)
            if hasFullAccess {
                Button(action: switchKeyboard) {
                    Image(systemName: "globe")
                        .font(.system(size: 16))
                        .foregroundColor(.secondary.opacity(0.5))
                        .frame(width: 30, height: 30)
                }
                .buttonStyle(.plain)
                .padding(.leading, 8)
                .padding(.bottom, 6)
            }
        }
        .background(bgColor)
    }

    // MARK: - Full Access Warning

    private var fullAccessWarning: some View {
        VStack(spacing: 12) {
            Text("⚠️")
                .font(.system(size: 40))
            Text("Enable Full Access")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.primary)
            Text("Go to Settings → Keyboard → SeedlingSpeaks → Allow Full Access")
                .font(.system(size: 14))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Tone Selector

    private var toneSelector: some View {
        HStack(spacing: 10) {
            ForEach(ToneOption.allCases, id: \.self) { tone in
                Button(action: { selectedTone = tone }) {
                    HStack(spacing: 6) {
                        Text(tone.icon)
                            .font(.system(size: 22))
                        Text(tone.rawValue)
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(
                        selectedTone == tone
                            ? saffron.opacity(0.15)
                            : surfaceColor
                    )
                    .foregroundColor(
                        selectedTone == tone
                            ? Color(red: 0.79, green: 0.43, blue: 0.03)
                            : .secondary
                    )
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(
                                selectedTone == tone ? saffron : Color.clear,
                                lineWidth: 2
                            )
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 6)
    }

    // MARK: - Microphone Button

    private var microphoneButton: some View {
        VStack(spacing: 10) {
            Button(action: handleMicTap) {
                ZStack {
                    // Pulse ring (when recording)
                    if recordingState == .recording {
                        Circle()
                            .fill(Color.red.opacity(0.15))
                            .frame(width: 110, height: 110)
                            .scaleEffect(pulseAnimation ? 1.3 : 1.0)
                            .opacity(pulseAnimation ? 0.0 : 0.6)
                            .animation(
                                .easeInOut(duration: 1.0).repeatForever(autoreverses: false),
                                value: pulseAnimation
                            )
                    }

                    Circle()
                        .fill(recordingState.color)
                        .frame(width: 88, height: 88)
                        .shadow(color: recordingState.color.opacity(0.3), radius: 8, y: 4)

                    if recordingState == .processing {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(1.5)
                    } else {
                        Image(systemName: recordingState == .recording ? "stop.fill" : "mic.fill")
                            .font(.system(size: 36, weight: .medium))
                            .foregroundColor(.white)
                    }
                }
            }
            .buttonStyle(.plain)
            .disabled(recordingState == .processing)

            Text(recordingState.label)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(recordingState == .recording ? .red : .secondary)

            if let error = errorMessage {
                Text(error)
                    .font(.system(size: 12))
                    .foregroundColor(.red)
                    .padding(.horizontal)
                    .multilineTextAlignment(.center)
            }
        }
    }


    // MARK: - Recording Logic

    private func handleMicTap() {
        switch recordingState {
        case .idle:
            startRecording()
        case .recording:
            stopRecordingAndProcess()
        case .processing:
            break
        }
    }

    private func startRecording() {
        errorMessage = nil
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.record, mode: .default)
            try session.setActive(true)
        } catch {
            errorMessage = "Microphone not available"
            return
        }

        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent("keyboard_recording.m4a")

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 16000,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue,
        ]

        do {
            audioRecorder = try AVAudioRecorder(url: fileURL, settings: settings)
            audioRecorder?.record()
            recordingState = .recording
            pulseAnimation = true
        } catch {
            errorMessage = "Could not start recording"
        }
    }

    private func stopRecordingAndProcess() {
        guard let recorder = audioRecorder else { return }
        recorder.stop()
        audioRecorder = nil
        pulseAnimation = false
        recordingState = .processing

        let fileURL = recorder.url

        // Send to backend
        NetworkManager.shared.transcribeAndRetone(
            audioFileURL: fileURL,
            tone: selectedTone.rawValue
        ) { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let text):
                    insertText(text)
                    recordingState = .idle
                case .failure(let error):
                    errorMessage = "Failed: \(error.localizedDescription)"
                    recordingState = .idle
                }
                // Clean up temp file
                try? FileManager.default.removeItem(at: fileURL)
            }
        }
    }
}
