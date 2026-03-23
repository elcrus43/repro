from weasyprint import HTML
from jinja2 import Template
from datetime import datetime
from typing import Optional
from .estimation_service import EstimationResult

class EstimationReportGenerator:
    TEMPLATE = """
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Arial', sans-serif; margin: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
            .header h1 { color: #2563eb; margin: 0; }
            .params { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .params table { width: 100%; }
            .params td { padding: 6px 12px; }
            .params td:first-child { font-weight: bold; width: 40%; color: #64748b; }
            .estimation { text-align: center; margin: 30px 0; }
            .price-range { display: flex; justify-content: space-around; margin: 20px 0; }
            .price-box { text-align: center; padding: 15px; border-radius: 8px; flex: 1; margin: 0 10px; }
            .price-min { background: #fef3c7; }
            .price-avg { background: #d1fae5; font-size: 1.2em; }
            .price-max { background: #fee2e2; }
            .price-value { font-size: 1.3em; font-weight: bold; }
            .analogs table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 0.9em; }
            .analogs th { background: #2563eb; color: white; padding: 10px; text-align: left; }
            .analogs td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
            .analogs tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 0.8em; }
            .confidence { display: inline-block; padding: 4px 12px; border-radius: 12px; font-weight: bold; }
            .confidence-HIGH { background: #d1fae5; color: #065f46; }
            .confidence-MEDIUM { background: #fef3c7; color: #92400e; }
            .confidence-LOW { background: #fee2e2; color: #991b1b; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Оценка рыночной стоимости</h1>
            <p>{{ date }}</p>
        </div>
        
        <div class="params">
            <h3>Параметры объекта</h3>
            <table>
                <tr><td>Город:</td><td>{{ params.city }}</td></tr>
                <tr><td>Район:</td><td>{{ params.district }}</td></tr>
                <tr><td>Комнат:</td><td>{{ params.rooms }}</td></tr>
                <tr><td>Площадь:</td><td>{{ params.total_area }} м²</td></tr>
                <tr><td>Этаж:</td><td>{{ params.floor }} из {{ params.total_floors }}</td></tr>
                <tr><td>Тип сделки:</td><td>{{ params.deal_type }}</td></tr>
            </table>
        </div>
        
        <div class="estimation">
            <h2>Расчётная стоимость</h2>
            <div class="price-range">
                <div class="price-box price-min">
                    <div>Минимум</div>
                    <div class="price-value">{{ format_price(result.estimated_min) }} ₽</div>
                </div>
                <div class="price-box price-avg">
                    <div>Среднее</div>
                    <div class="price-value">{{ format_price(result.estimated_avg) }} ₽</div>
                </div>
                <div class="price-box price-max">
                    <div>Максимум</div>
                    <div class="price-value">{{ format_price(result.estimated_max) }} ₽</div>
                </div>
            </div>
            <p>Цена за м²: <strong>{{ format_price(result.price_per_sqm_avg) }} ₽</strong></p>
            <p>Достоверность: <span class="confidence confidence-{{ result.confidence }}">{{ result.confidence }}</span></p>
        </div>
        
        <div class="analogs">
            <h3>Ближайшие аналоги</h3>
            <table>
                <thead>
                    <tr>
                        <th>Источник</th>
                        <th>Адрес / Район</th>
                        <th>Комн.</th>
                        <th>Площадь</th>
                        <th>Цена</th>
                        <th>₽/м²</th>
                    </tr>
                </thead>
                <tbody>
                    {% for a in result.analogs %}
                    <tr>
                        <td>{{ a.source }}</td>
                        <td>{{ a.address or a.district }}</td>
                        <td>{{ a.rooms }}</td>
                        <td>{{ a.total_area }} м²</td>
                        <td>{{ format_price(a.price) }}</td>
                        <td>{{ format_price(a.price / a.total_area) if a.total_area else '-' }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>Отчёт сформирован автоматически системой Realtor CRM</p>
            <p>Оценка носит информационный характер</p>
        </div>
    </body>
    </html>
    """

    def generate(self, params: dict, result: EstimationResult) -> bytes:
        template = Template(self.TEMPLATE)
        html_content = template.render(
            params=params,
            result=result,
            date=datetime.now().strftime("%d.%m.%Y"),
            format_price=lambda x: f"{int(x):,}".replace(",", " ")
        )
        return HTML(string=html_content).write_pdf()
