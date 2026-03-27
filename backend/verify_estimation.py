import asyncio
import sys
import os

# Add the directory containing 'app' to sys.path
sys.path.append(os.getcwd())

from app.services.estimation_service import EstimationService, EstimationInput
from app.core.database import SessionLocal, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup local SQLite for testing
TEST_DB_URL = "sqlite:///./test_crm.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def test_estimation():
    print(f"Testing estimation with fresh parsing (SQLite: {TEST_DB_URL})...")
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    service = EstimationService(db)
    
    # Large area/rooms to ensure we don't have enough local data
    params = EstimationInput(
        city="Москва",
        district="Пресненский",
        rooms=3,
        total_area=120.5,
        floor=10,
        total_floors=25,
        deal_type="SALE"
    )
    
    try:
        # This should trigger search_all because we likely have < 10 analogs for 120m2 in Presnenskiy
        result = await service.estimate(params)
        print(f"Estimation result: {result.estimated_avg:,} RUB")
        print(f"Confidence: {result.confidence}")
        print(f"Analogs found: {result.analogs_count}")
        print(f"Sources: {result.sources_breakdown}")
        
        for a in result.analogs[:3]:
            print(f"- {a.source}: {a.price:,} RUB ({a.total_area} m2)")
            
    except Exception as e:
        print(f"Error during estimation: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_estimation())
