"""
diarization_service.py — Split a transcript into per-speaker segments.
Tries audio-based diarization first, then Gemini text splitting, then a sentence split.
"""
import logging
import re

from services.audio_diarization import diarize_audio_file
from services.gemini_client import GEMINI_API_KEY, generate_json
from services.tts_service import MALE_VOICES, FEMALE_VOICES

logger = logging.getLogger(__name__)

MAX_SPEAKERS = 5


def diarize(transcript: str, audio_path: str | None = None, speaker_count: int = 0) -> tuple[list[dict], str]:
    """
    Returns (segments, method) where method is "audio", "gemini" or "fallback".
    Each segment has speaker, text, emotion, start, end, gender and voice.
    """
    if audio_path:
        segments = diarize_audio_file(audio_path, transcript)
        if segments:
            return assign_speaker_voices(segments), "audio"
        logger.warning("[diarize] Audio diarization returned no segments, falling back to Gemini text split")

    segments = _gemini_split(transcript, speaker_count)
    if segments:
        return assign_speaker_voices(segments), "gemini"

    return assign_speaker_voices(_sentence_split(transcript, speaker_count)), "fallback"


def _gemini_split(transcript: str, speaker_count: int) -> list[dict]:
    if not GEMINI_API_KEY:
        return []

    if speaker_count >= 2:
        speaker_instruction = (
            f"IMPORTANT: There are EXACTLY {speaker_count} speakers. "
            f"You MUST use exactly {speaker_count} different people: "
            f"{', '.join([f'Person {i+1}' for i in range(speaker_count)])}."
        )
    else:
        speaker_instruction = "Identify how many distinct speakers there are (2 to 5)."

    prompt = f"""You are an expert conversation analyst.

{speaker_instruction}

Split this transcript into individual speaker turns.
- Every sentence belongs to exactly one speaker
- Short responses like "yes", "okay" are often a different speaker
- Questions are usually answered by a different speaker
- Detect emotion per segment: happy, neutral, serious, sad, angry, excited
- Return ONLY a valid JSON array

Format:
[
  {{"speaker": "Person 1", "text": "...", "emotion": "neutral"}},
  {{"speaker": "Person 2", "text": "...", "emotion": "happy"}}
]

Transcript:
{transcript}"""

    try:
        parsed = generate_json(prompt)
    except Exception as e:
        logger.warning(f"[diarize] Gemini split failed: {e}")
        return []
    if not isinstance(parsed, list):
        return []

    segments = []
    for seg in parsed:
        if not isinstance(seg, dict):
            continue
        text = str(seg.get("text", "")).strip()
        if not text:
            continue
        num = int("".join(filter(str.isdigit, str(seg.get("speaker", "")))) or "1")
        segments.append({
            "speaker": f"Person {max(1, min(num, MAX_SPEAKERS))}",
            "text": text,
            "emotion": str(seg.get("emotion", "neutral")).lower(),
            "start": 0,
            "end": 0,
        })
    return segments


def _sentence_split(transcript: str, speaker_count: int) -> list[dict]:
    n_speakers = speaker_count if 2 <= speaker_count <= MAX_SPEAKERS else 2
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", transcript) if s.strip()]
    return [
        {"speaker": f"Person {(i % n_speakers) + 1}", "text": sent, "emotion": "neutral", "start": 0, "end": 0}
        for i, sent in enumerate(sentences)
    ]


def assign_speaker_voices(segments: list[dict]) -> list[dict]:
    """
    Assign Sarvam TTS voices to each speaker.
    If gender was detected by audio analysis, use it.
    Otherwise alternate male/female.
    """
    speaker_map      = {}
    male_voice_idx   = 0
    female_voice_idx = 0

    for seg in segments:
        sp     = seg["speaker"]
        gender = seg.get("gender", "")  # set by audio diarization if available

        if sp not in speaker_map:
            if not gender:
                # Alternate male/female if no audio gender info
                gender = "male" if len(speaker_map) % 2 == 0 else "female"

            if gender == "female":
                voice = FEMALE_VOICES[female_voice_idx % len(FEMALE_VOICES)]
                female_voice_idx += 1
            else:
                voice = MALE_VOICES[male_voice_idx % len(MALE_VOICES)]
                male_voice_idx += 1

            speaker_map[sp] = {"sarvam": voice, "gtts_gender": gender}

        # Only set voice if not already set by audio diarization
        if not seg.get("voice") or not seg["voice"].get("sarvam"):
            seg["voice"]   = speaker_map[sp]
        if not seg.get("gender"):
            seg["gender"]  = speaker_map[sp]["gtts_gender"]

    return segments
