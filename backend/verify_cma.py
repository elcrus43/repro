import sys
import os

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_cma_endpoint():
    print("Sending request to /api/v1/cma/run...")
    payload = {
        "city": "Киров",
        "district": "",
        "rooms": 1,
        "total_area": 35.0,
        "floor": 3,
        "total_floors": 9,
        "deal_type": "SALE",
        "property_price": 3000000
    }
    
    try:
        response = client.post("/api/v1/cma/run", json=payload)
        print("Status code:", response.status_code)
        if response.status_code == 200:
            data = response.json()
            print("Success!")
            print(f"Confidence: {data.get('confidence')}")
            print(f"Market Average: {data.get('market_avg')} RUB")
            print(f"Fast Price: {data.get('price_fast')} RUB")
            print(f"Optimal Price: {data.get('price_optimal')} RUB")
            print(f"Premium Price: {data.get('price_premium')} RUB")
            print(f"Position: {data.get('position_pct')}%")
            recommendation = data.get('recommendation', '').replace('₽', 'RUB')
            print(f"Recommendation: {recommendation}")
            print(f"Analogs found: {len(data.get('analogs', []))}")
        else:
            print("Error details:", response.text)
    except Exception as e:
        print("Failed to run CMA test:", e)

if __name__ == "__main__":
    test_cma_endpoint()
