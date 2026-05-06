import openai
from typing import Optional
from ..core.config import settings

class AIService:
    """Service for AI-powered text generation (OpenAI or YandexGPT)"""
    
    def __init__(self):
        if settings.OPENAI_API_KEY:
            openai.api_key = settings.OPENAI_API_KEY

    async def generate_property_description(self, property_data: dict) -> str:
        """Generate a catchy property description based on its features"""
        if not settings.OPENAI_API_KEY:
            return "AI service is not configured. Please add OpenAI API key to .env"
            
        prompt = f"""
        Напиши продающее объявление для квартиры со следующими параметрами:
        Город: {property_data.get('city')}
        Район: {property_data.get('district')}
        Комнат: {property_data.get('rooms')}
        Площадь: {property_data.get('total_area')} м²
        Этаж: {property_data.get('floor')}/{property_data.get('total_floors')}
        Ремонт: {property_data.get('renovation')}
        Дополнительно: {property_data.get('features', 'не указано')}
        
        Текст должен быть структурированным, с эмодзи и призывом к действию.
        """
        
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Ты — профессиональный копирайтер по недвижимости."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=600,
                temperature=0.7
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error generating description: {str(e)}"

    async def parse_mortgage_calculation(self, image_url: str) -> dict:
        """Parse mortgage details from a screenshot using GPT Vision"""
        if not settings.OPENAI_API_KEY:
            # Mock response for demo purposes
            import random
            return {
                "rate": 14.75,
                "monthly_payment": 45000 + random.randint(0, 10000),
                "term": 30,
                "down_payment": 20,
                "confidence": 0.9
            }
            
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract mortgage calculation details from this image. Return JSON with keys: rate (float), monthly_payment (int), term (int, years), down_payment_percent (int). Return ONLY JSON."},
                            {
                                "type": "image_url",
                                "image_url": {"url": image_url},
                            },
                        ],
                    }
                ],
                max_tokens=300,
            )
            import json
            import re
            text = response.choices[0].message.content
            # Extract JSON from text if any
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                return json.loads(match.group())
            return {"error": "Could not parse JSON from response"}
        except Exception as e:
            print(f"Error parsing image: {e}")
            return {"error": str(e)}
