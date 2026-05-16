import io
import os
import tempfile
import logging
from pathlib import Path

from fastapi import UploadFile
from groq import Groq
from pydub import AudioSegment

log = logging.getLogger(__name__)

# Groq Whisper hard limit is 25 MB per request.
# We target 20 MB compressed chunks to stay safely under it.
GROQ_MAX_BYTES = 20 * 1024 * 1024  # 20 MB

# Target export settings — mono 16 kHz MP3 at 32 kbps gives ~14 KB/s,
# so a 30-minute call ≈ 25 MB. For longer calls we chunk automatically.
EXPORT_BITRATE = "32k"
EXPORT_SAMPLE_RATE = 16000
CHUNK_DURATION_MS = 10 * 60 * 1000  # 10-minute chunks

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def _compress_to_mp3(input_path: str, output_path: str) -> None:
    """Convert any audio file to mono 16 kHz MP3 at 32 kbps."""
    audio = AudioSegment.from_file(input_path)
    audio = audio.set_channels(1).set_frame_rate(EXPORT_SAMPLE_RATE)
    audio.export(output_path, format="mp3", bitrate=EXPORT_BITRATE)


def _transcribe_file(file_path: str) -> str:
    """Send a single file to Groq Whisper and return the transcript text."""
    with open(file_path, "rb") as f:
        result = client.audio.transcriptions.create(
            file=(Path(file_path).name, f.read()),
            model="whisper-large-v3",
        )
    return result.text


def _split_and_transcribe(compressed_path: str) -> str:
    """
    If the compressed file is still over the limit, split into 10-minute
    chunks, transcribe each, and join the results.
    """
    audio = AudioSegment.from_mp3(compressed_path)
    total_ms = len(audio)
    transcripts: list[str] = []
    chunk_index = 0
    offset = 0

    while offset < total_ms:
        chunk = audio[offset: offset + CHUNK_DURATION_MS]
        offset += CHUNK_DURATION_MS
        chunk_index += 1

        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            chunk_path = tmp.name

        try:
            chunk.export(chunk_path, format="mp3", bitrate=EXPORT_BITRATE)
            chunk_size = os.path.getsize(chunk_path)
            log.info(f"Chunk {chunk_index}: {chunk_size / 1024 / 1024:.1f} MB")
            text = _transcribe_file(chunk_path)
            transcripts.append(text.strip())
        finally:
            os.remove(chunk_path)

    return " ".join(transcripts)


async def generate_transcript(audio_file: UploadFile) -> str:
    """
    1. Save the uploaded file to a temp path.
    2. Compress to mono 16 kHz MP3 (reduces size ~10x).
    3. If compressed size ≤ 20 MB → send directly to Groq.
    4. If still > 20 MB → split into 10-min chunks and transcribe each.
    5. Clean up all temp files.
    """
    # Determine original file extension for pydub format hint
    original_name = audio_file.filename or "audio.m4a"
    suffix = Path(original_name).suffix or ".m4a"

    raw_path = ""
    compressed_path = ""

    try:
        # ── Step 1: Save raw upload ──────────────────────────────────────
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as raw_tmp:
            raw_path = raw_tmp.name
            content = await audio_file.read()
            raw_tmp.write(content)

        raw_size_mb = len(content) / 1024 / 1024
        log.info(f"Received audio: {raw_size_mb:.1f} MB ({original_name})")

        # ── Step 2: Compress ─────────────────────────────────────────────
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as comp_tmp:
            compressed_path = comp_tmp.name

        _compress_to_mp3(raw_path, compressed_path)
        compressed_size = os.path.getsize(compressed_path)
        log.info(f"Compressed to: {compressed_size / 1024 / 1024:.1f} MB")

        # ── Step 3 / 4: Transcribe ───────────────────────────────────────
        if compressed_size <= GROQ_MAX_BYTES:
            transcript = _transcribe_file(compressed_path)
        else:
            log.info("File exceeds 20 MB after compression — splitting into chunks")
            transcript = _split_and_transcribe(compressed_path)

        return transcript

    finally:
        # ── Step 5: Cleanup ──────────────────────────────────────────────
        for path in (raw_path, compressed_path):
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass
