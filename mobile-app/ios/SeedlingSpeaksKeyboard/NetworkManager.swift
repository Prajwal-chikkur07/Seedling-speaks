import Foundation

/// Handles multipart audio upload to the SeedlingSpeaks backend.
/// Uses URLSession only (no third-party dependencies allowed in extensions).
class NetworkManager {

    static let shared = NetworkManager()

    // MARK: - Configuration
    // Update this to your production backend URL
    private let baseURL = "https://seedlingspeaks-backend-0vkj.onrender.com"

    private init() {}

    // MARK: - Two-Step Flow: Transcribe → Retone

    /// Uploads audio for transcription, then applies tone rewriting.
    /// Returns the final retoned text via completion handler.
    func transcribeAndRetone(
        audioFileURL: URL,
        tone: String,
        completion: @escaping (Result<String, Error>) -> Void
    ) {
        // Step 1: Transcribe audio
        transcribeAudio(fileURL: audioFileURL) { [weak self] result in
            switch result {
            case .success(let transcript):
                guard !transcript.isEmpty else {
                    completion(.failure(NetworkError.emptyTranscript))
                    return
                }
                // Step 2: Apply tone rewriting
                self?.rewriteTone(text: transcript, tone: tone) { retoneResult in
                    switch retoneResult {
                    case .success(let retonedText):
                        completion(.success(retonedText))
                    case .failure:
                        // Fallback: return raw transcript if retone fails
                        completion(.success(transcript))
                    }
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    // MARK: - Step 1: Transcribe Audio (Multipart Upload)

    private func transcribeAudio(
        fileURL: URL,
        completion: @escaping (Result<String, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/translate-audio") else {
            completion(.failure(NetworkError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 60

        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue(
            "multipart/form-data; boundary=\(boundary)",
            forHTTPHeaderField: "Content-Type"
        )

        // Build multipart body
        guard let audioData = try? Data(contentsOf: fileURL) else {
            completion(.failure(NetworkError.fileReadError))
            return
        }

        var body = Data()
        body.append("--\(boundary)\r\n")
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"recording.m4a\"\r\n")
        body.append("Content-Type: audio/mp4\r\n\r\n")
        body.append(audioData)
        body.append("\r\n--\(boundary)--\r\n")

        request.httpBody = body

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            guard let data = data else {
                completion(.failure(NetworkError.noData))
                return
            }

            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let transcript = json["transcript"] as? String {
                    completion(.success(transcript))
                } else {
                    completion(.failure(NetworkError.parseError))
                }
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }

    // MARK: - Step 2: Rewrite Tone (JSON POST)

    private func rewriteTone(
        text: String,
        tone: String,
        completion: @escaping (Result<String, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/rewrite-tone") else {
            completion(.failure(NetworkError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = [
            "text": text,
            "tone": tone,
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        } catch {
            completion(.failure(error))
            return
        }

        URLSession.shared.dataTask(with: request) { data, _, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            guard let data = data else {
                completion(.failure(NetworkError.noData))
                return
            }

            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let rewritten = json["rewritten_text"] as? String {
                    completion(.success(rewritten))
                } else {
                    completion(.failure(NetworkError.parseError))
                }
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
}

// MARK: - Error Types

enum NetworkError: LocalizedError {
    case invalidURL
    case fileReadError
    case noData
    case parseError
    case emptyTranscript

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid server URL"
        case .fileReadError: return "Could not read audio file"
        case .noData: return "No response from server"
        case .parseError: return "Could not understand server response"
        case .emptyTranscript: return "No speech detected. Try again."
        }
    }
}

// MARK: - Data Extension for Multipart

extension Data {
    mutating func append(_ string: String) {
        if let data = string.data(using: .utf8) {
            append(data)
        }
    }
}
