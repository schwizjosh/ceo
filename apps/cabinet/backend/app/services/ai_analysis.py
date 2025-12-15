"""
AI Analysis Service
Handles AI-powered analysis using GPT-4 or Claude for:
- Summary generation
- Sentiment analysis
- Category classification
- Action item extraction
- Key insights extraction
"""

import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from openai import AsyncOpenAI
from anthropic import AsyncAnthropic

from app.config import settings


logger = logging.getLogger(__name__)


class AIAnalysisService:
    """
    Service for AI-powered transcript analysis.
    Supports both OpenAI (GPT-4) and Anthropic (Claude) models.
    """
    
    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
        
        if settings.anthropic_api_key:
            self.anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        else:
            self.anthropic_client = None
    
    async def analyze_transcript(
        self,
        text: str,
        title: str = "",
        model: str = None,
        extract_actions: bool = True,
    ) -> Dict[str, Any]:
        """
        Perform comprehensive AI analysis on a transcript.
        
        Args:
            text: Full transcript text
            title: Transcript title for context
            model: AI model to use (defaults to settings.analysis_model)
            extract_actions: Whether to extract action items
            
        Returns:
            Dict with analysis results:
            - summary: 2-3 sentence overview
            - key_insights: List of important points
            - sentiment: positive/neutral/negative/mixed
            - sentiment_score: -1.0 to 1.0
            - categories: Suggested categories
            - topics: Main topics discussed
            - tags: Relevant tags
            - action_items: Extracted tasks (if enabled)
        """
        model = model or settings.analysis_model
        
        logger.info(f"Starting AI analysis with model: {model}")
        
        # Build the analysis prompt
        prompt = self._build_analysis_prompt(text, title, extract_actions)
        
        try:
            # Use appropriate client based on model
            if model.startswith("claude"):
                result = await self._analyze_with_claude(prompt, model)
            else:
                result = await self._analyze_with_openai(prompt, model)
            
            logger.info("AI analysis completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"AI analysis failed: {str(e)}")
            raise AIAnalysisError(f"Failed to analyze transcript: {str(e)}")
    
    def _build_analysis_prompt(
        self, 
        text: str, 
        title: str,
        extract_actions: bool
    ) -> str:
        """Build the analysis prompt for the AI model."""
        
        action_instructions = ""
        if extract_actions:
            action_instructions = """
5. action_items: Array of action items extracted from the transcript. Each item should have:
   - description: Clear description of the task
   - assigned_to: Person responsible (if mentioned), or null
   - due_date: Due date in YYYY-MM-DD format (if mentioned), or null
   - priority: "low", "medium", "high", or "urgent" based on importance/urgency cues
   - confidence: 0.0-1.0 confidence in the extraction
   - source_text: The original text that indicates this action item
"""
        
        return f"""Analyze the following transcript and provide a structured analysis.

Title: {title or "Untitled"}

Transcript:
---
{text[:15000]}  
---
{"[Text truncated for length]" if len(text) > 15000 else ""}

Provide a JSON response with the following structure:
{{
    "summary": "2-3 sentence overview of the transcript content",
    "key_insights": ["insight 1", "insight 2", ...],
    "sentiment": "positive" | "neutral" | "negative" | "mixed",
    "sentiment_score": <float from -1.0 (very negative) to 1.0 (very positive)>,
    "categories": ["suggested category 1", "suggested category 2"],
    "topics": ["main topic 1", "main topic 2", ...],
    "tags": ["relevant", "tags", "for", "organization"],
    {"\"action_items\": [...]" if extract_actions else ""}
}}

Guidelines:
1. summary: Concise overview capturing the main purpose and outcomes
2. key_insights: 3-7 bullet points of the most important information
3. sentiment: Overall emotional tone of the conversation
4. sentiment_score: Precise numeric score reflecting positivity/negativity
{action_instructions}

Respond with ONLY the JSON object, no additional text."""

    async def _analyze_with_openai(
        self, 
        prompt: str, 
        model: str
    ) -> Dict[str, Any]:
        """Perform analysis using OpenAI GPT models."""
        
        response = await self.openai_client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert transcript analyst. Provide accurate, structured analysis in JSON format."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=4000,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        return self._parse_response(content)
    
    async def _analyze_with_claude(
        self, 
        prompt: str, 
        model: str
    ) -> Dict[str, Any]:
        """Perform analysis using Anthropic Claude models."""
        
        if not self.anthropic_client:
            raise AIAnalysisError("Anthropic API key not configured")
        
        response = await self.anthropic_client.messages.create(
            model=model,
            max_tokens=4000,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        
        content = response.content[0].text
        return self._parse_response(content)
    
    def _parse_response(self, content: str) -> Dict[str, Any]:
        """Parse the AI response into structured data."""
        
        try:
            # Try to parse as JSON
            result = json.loads(content)
        except json.JSONDecodeError:
            # Try to extract JSON from the response
            import re
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                result = json.loads(json_match.group())
            else:
                raise AIAnalysisError("Could not parse AI response as JSON")
        
        # Validate and normalize the response
        return self._normalize_response(result)
    
    def _normalize_response(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize and validate the analysis response."""
        
        normalized = {
            "summary": result.get("summary", ""),
            "key_insights": result.get("key_insights", []),
            "sentiment": result.get("sentiment", "neutral"),
            "sentiment_score": float(result.get("sentiment_score", 0.0)),
            "categories": result.get("categories", []),
            "topics": result.get("topics", []),
            "tags": result.get("tags", []),
            "action_items": [],
        }
        
        # Validate sentiment
        valid_sentiments = ["positive", "neutral", "negative", "mixed"]
        if normalized["sentiment"] not in valid_sentiments:
            normalized["sentiment"] = "neutral"
        
        # Clamp sentiment score
        normalized["sentiment_score"] = max(-1.0, min(1.0, normalized["sentiment_score"]))
        
        # Process action items
        if "action_items" in result:
            for item in result["action_items"]:
                normalized["action_items"].append({
                    "description": item.get("description", ""),
                    "assigned_to": item.get("assigned_to"),
                    "due_date": item.get("due_date"),
                    "priority": item.get("priority", "medium"),
                    "confidence": float(item.get("confidence", 0.8)),
                    "source_text": item.get("source_text", ""),
                })
        
        return normalized
    
    async def generate_summary(
        self, 
        text: str, 
        max_sentences: int = 3,
        model: str = None
    ) -> str:
        """
        Generate a concise summary of the transcript.
        
        Args:
            text: Transcript text
            max_sentences: Maximum number of sentences
            model: AI model to use
            
        Returns:
            Summary string
        """
        model = model or settings.analysis_model
        
        prompt = f"""Summarize the following text in {max_sentences} sentences or less:

{text[:10000]}

Provide only the summary, no additional text."""

        try:
            response = await self.openai_client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500,
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Summary generation failed: {str(e)}")
            return ""
    
    async def extract_action_items(
        self, 
        text: str,
        model: str = None
    ) -> List[Dict[str, Any]]:
        """
        Extract action items from transcript text.
        
        Args:
            text: Transcript text
            model: AI model to use
            
        Returns:
            List of action item dictionaries
        """
        analysis = await self.analyze_transcript(
            text, 
            model=model, 
            extract_actions=True
        )
        return analysis.get("action_items", [])


class AIAnalysisError(Exception):
    """Custom exception for AI analysis errors."""
    pass
