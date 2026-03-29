import json
import os

from groq import Groq

client = Groq(api_key=os.getenv("Groq_helpcenter"))

SYSTEM_PROMPT = """
You are a fintech customer support classifier for VyomNext bank app.
You will receive a complaint message and must respond ONLY with a raw JSON object.
No markdown, no code fences, no explanation - just the JSON.
"""

USER_PROMPT_TEMPLATE = """
Analyze this complaint and return ONLY this JSON structure:
{{
  "summary": "<one sentence summary, max 20 words>",
  "category": "<exactly one of: loan, kyc, transfer, account, general>",
  "sentiment": "<exactly one of: positive, neutral, negative>"
}}

Complaint:
{message}
"""


def process_complaint(raw_message: str) -> dict:
    """
    Send complaint to Groq llama3-8b-8192.
    Returns dict with keys: summary, category, sentiment.
    Falls back to safe defaults if parsing fails.
    """
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": USER_PROMPT_TEMPLATE.format(message=raw_message),
                },
            ],
            temperature=0.2,
            max_tokens=200,
        )
        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(raw)

    except Exception as e:
        print(f"[groq_service] Error processing complaint: {e}")
        return {
            "summary": "Unable to classify complaint automatically.",
            "category": "general",
            "sentiment": "neutral",
        }