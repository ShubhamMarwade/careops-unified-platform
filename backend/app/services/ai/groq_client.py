from groq import Groq
from app.config import settings

client = Groq(api_key=settings.groq_api_key)

def generate_response(prompt: str) -> str:
    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",   # ✅ Updated model
        messages=[
            {"role": "system", "content": "You are CareOpsGPT, an AI business operations expert."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=800,
    )

    return completion.choices[0].message.content
