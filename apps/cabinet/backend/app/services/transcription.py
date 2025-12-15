"""
Transcription Service
Handles audio/video transcription using OpenAI Whisper API.
"""

import os
import logging
import tempfile
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

from openai import AsyncOpenAI

from app.config import settings


logger = logging.getLogger(__name__)


class TranscriptionService:
    """
    Service for transcribing audio and video files using OpenAI Whisper.
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.whisper_model
        
    async def transcribe_audio(
        self,
        file_path: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Transcribe an audio file using OpenAI Whisper.
        
        Args:
            file_path: Path to the audio file
            language: Optional language code (e.g., 'en', 'es')
            prompt: Optional prompt to guide transcription
            
        Returns:
            Dict with transcription results:
            - text: Full transcription text
            - language: Detected language
            - duration: Audio duration in seconds
            - segments: Timestamped segments (if available)
        """
        logger.info(f"Starting transcription for: {file_path}")
        
        try:
            with open(file_path, "rb") as audio_file:
                # Build request parameters
                params = {
                    "model": self.model,
                    "file": audio_file,
                    "response_format": "verbose_json",
                }
                
                if language:
                    params["language"] = language
                    
                if prompt:
                    params["prompt"] = prompt
                
                # Call Whisper API
                response = await self.client.audio.transcriptions.create(**params)
                
                result = {
                    "text": response.text,
                    "language": getattr(response, "language", language or "en"),
                    "duration": getattr(response, "duration", None),
                    "segments": [],
                }
                
                # Extract segments if available
                if hasattr(response, "segments"):
                    result["segments"] = [
                        {
                            "id": seg.get("id"),
                            "start": seg.get("start"),
                            "end": seg.get("end"),
                            "text": seg.get("text"),
                        }
                        for seg in response.segments
                    ]
                
                logger.info(
                    f"Transcription completed: {len(result['text'])} chars, "
                    f"duration: {result['duration']}s"
                )
                
                return result
                
        except Exception as e:
            logger.error(f"Transcription failed: {str(e)}")
            raise TranscriptionError(f"Failed to transcribe audio: {str(e)}")
    
    async def transcribe_video(
        self,
        video_path: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Transcribe a video file by extracting audio and using Whisper.
        
        Args:
            video_path: Path to the video file
            language: Optional language code
            prompt: Optional prompt to guide transcription
            
        Returns:
            Dict with transcription results (same as transcribe_audio)
        """
        logger.info(f"Starting video transcription for: {video_path}")
        
        # Extract audio from video
        audio_path = await self._extract_audio(video_path)
        
        try:
            # Transcribe the extracted audio
            result = await self.transcribe_audio(audio_path, language, prompt)
            return result
        finally:
            # Clean up temporary audio file
            if os.path.exists(audio_path):
                os.remove(audio_path)
    
    async def _extract_audio(self, video_path: str) -> str:
        """
        Extract audio from video file using ffmpeg.
        
        Args:
            video_path: Path to the video file
            
        Returns:
            Path to the extracted audio file
        """
        logger.info(f"Extracting audio from video: {video_path}")
        
        # Create temporary file for audio
        temp_dir = tempfile.gettempdir()
        audio_filename = f"cabinet_audio_{os.path.basename(video_path)}.mp3"
        audio_path = os.path.join(temp_dir, audio_filename)
        
        try:
            # Use ffmpeg to extract audio
            cmd = [
                "ffmpeg",
                "-i", video_path,
                "-vn",  # No video
                "-acodec", "libmp3lame",
                "-ar", "16000",  # 16kHz sample rate (optimal for Whisper)
                "-ac", "1",  # Mono
                "-y",  # Overwrite
                audio_path
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600  # 10 minute timeout
            )
            
            if result.returncode != 0:
                raise TranscriptionError(
                    f"ffmpeg failed: {result.stderr}"
                )
            
            logger.info(f"Audio extracted to: {audio_path}")
            return audio_path
            
        except subprocess.TimeoutExpired:
            raise TranscriptionError("Audio extraction timed out")
        except FileNotFoundError:
            raise TranscriptionError(
                "ffmpeg not found. Please install ffmpeg."
            )
    
    async def get_audio_duration(self, file_path: str) -> float:
        """
        Get the duration of an audio/video file in seconds.
        
        Args:
            file_path: Path to the media file
            
        Returns:
            Duration in seconds
        """
        try:
            cmd = [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                file_path
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                return float(result.stdout.strip())
            else:
                return 0.0
                
        except Exception as e:
            logger.warning(f"Could not get duration: {str(e)}")
            return 0.0
    
    def is_supported_audio(self, filename: str) -> bool:
        """Check if file is a supported audio format."""
        ext = Path(filename).suffix.lower().lstrip(".")
        return ext in settings.allowed_audio_extensions
    
    def is_supported_video(self, filename: str) -> bool:
        """Check if file is a supported video format."""
        ext = Path(filename).suffix.lower().lstrip(".")
        return ext in settings.allowed_video_extensions


class TranscriptionError(Exception):
    """Custom exception for transcription errors."""
    pass
