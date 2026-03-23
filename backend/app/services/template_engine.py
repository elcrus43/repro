import re
from typing import Optional, Dict, Any, List
from jinja2 import Template

class TemplateEngine:
    """Template engine for message substitution using Jinja2-like syntax"""
    
    # Pattern for simple variables: {{variable_name}}
    VAR_PATTERN = re.compile(r'\{\{(\w+)\}\}')
    
    def extract_variables(self, template_body: str) -> List[str]:
        """Extract a list of variables from the template text"""
        return list(set(self.VAR_PATTERN.findall(template_body)))
    
    def render(
        self,
        template_body: str,
        context: Dict[str, Any]
    ) -> str:
        """Render the template with the provided context"""
        try:
            template = Template(template_body)
            return template.render(**context)
        except Exception as e:
            # Fallback to simple regex replacement if Jinja fails
            result = template_body
            for key, value in context.items():
                result = result.replace(f"{{{{{key}}}}}", str(value))
            return result

class MessageLinkGenerator:
    """Helper to generate links for external messaging apps"""
    
    @staticmethod
    def whatsapp_link(phone: str, text: str) -> str:
        from urllib.parse import quote
        clean_phone = re.sub(r'[^\d]', '', phone)
        if clean_phone.startswith('8'):
            clean_phone = '7' + clean_phone[1:]
        return f"https://wa.me/{clean_phone}?text={quote(text)}"
    
    @staticmethod
    def telegram_link(username: str, text: str) -> str:
        from urllib.parse import quote
        if username:
            return f"https://t.me/{username.replace('@', '')}?text={quote(text)}"
        return f"https://t.me/share/url?text={quote(text)}"
