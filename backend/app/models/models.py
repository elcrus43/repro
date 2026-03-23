from sqlalchemy import Column, String, Integer, BigInteger, Boolean, DateTime, DECIMAL, ForeignKey, Text, JSON, Time
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.sql import func
import uuid
from ..core.database import Base

class AnalogListing(Base):
    __tablename__ = "analog_listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source = Column(String(20), nullable=False)        # AVITO, CIAN, DOMCLICK
    source_id = Column(String(100), nullable=False)
    source_url = Column(String(500), nullable=False)
    
    title = Column(String(300))
    price = Column(BigInteger, nullable=False)
    
    city = Column(String(100), nullable=False)
    district = Column(String(200))
    address = Column(String(500))
    latitude = Column(DECIMAL(10, 7))
    longitude = Column(DECIMAL(10, 7))
    metro_station = Column(String(200))
    
    rooms = Column(Integer)
    total_area = Column(DECIMAL(8, 2))
    living_area = Column(DECIMAL(8, 2))
    kitchen_area = Column(DECIMAL(8, 2))
    floor = Column(Integer)
    total_floors = Column(Integer)
    building_type = Column(String(50))
    year_built = Column(Integer)
    renovation = Column(String(50))
    
    deal_type = Column(String(20), default='SALE')
    is_active = Column(Boolean, default=True)
    first_seen_at = Column(DateTime, default=func.now())
    last_seen_at = Column(DateTime, default=func.now(), onupdate=func.now())
    raw_data = Column(JSON)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class PriceEstimation(Base):
    __tablename__ = "price_estimations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), nullable=True) # Reference to existing property if any
    user_id = Column(UUID(as_uuid=True), nullable=False)
    
    input_params = Column(JSON, nullable=False)
    
    estimated_min = Column(BigInteger, nullable=False)
    estimated_avg = Column(BigInteger, nullable=False)
    estimated_max = Column(BigInteger, nullable=False)
    price_per_sqm_avg = Column(BigInteger, nullable=False)
    analogs_count = Column(Integer, nullable=False)
    analogs_ids = Column(JSON, nullable=False)
    
    result_details = Column(JSON)
    created_at = Column(DateTime, default=func.now())


class MessageTemplate(Base):
    __tablename__ = "message_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    
    name = Column(String(200), nullable=False)
    category = Column(String(50), default='OTHER')
    channels = Column(JSON, default=[])
    
    body = Column(Text, nullable=False)
    variables = Column(JSON, default=[])
    
    is_system = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    use_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class ReminderRule(Base):
    __tablename__ = "reminder_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True)) # NULL for system rules
    
    name = Column(String(200), nullable=False)
    trigger_type = Column(String(50), nullable=False)
    
    delay_hours = Column(Integer)
    delay_days = Column(Integer)
    time_of_day = Column(Time)
    
    message_template = Column(Text, nullable=False)
    priority = Column(String(10), default='NORMAL')
    
    is_active = Column(Boolean, default=True)
    is_system = Column(Boolean, default=False)
    
    condition_json = Column(JSON)
    created_at = Column(DateTime, default=func.now())


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id = Column(UUID(as_uuid=True), ForeignKey("reminder_rules.id"))
    user_id = Column(UUID(as_uuid=True), nullable=False)
    client_id = Column(UUID(as_uuid=True))
    deal_id = Column(UUID(as_uuid=True))
    event_id = Column(UUID(as_uuid=True))
    
    title = Column(String(300), nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String(10), default='NORMAL')
    
    remind_at = Column(DateTime, nullable=False)
    status = Column(String(20), default='PENDING')
    
    completed_at = Column(DateTime)
    snoozed_until = Column(DateTime)
    dismissed_at = Column(DateTime)
    
    created_at = Column(DateTime, default=func.now())


class PropertyLink(Base):
    __tablename__ = "property_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    
    slug = Column(String(10), nullable=False, unique=True)
    
    is_active = Column(Boolean, default=True)
    show_price = Column(Boolean, default=True)
    show_address = Column(Boolean, default=True)
    show_phone = Column(Boolean, default=True)
    show_agent_name = Column(Boolean, default=True)
    custom_note = Column(Text)
    
    views_count = Column(Integer, default=0)
    unique_views = Column(Integer, default=0)
    
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class PropertyView(Base):
    __tablename__ = "property_views"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    link_id = Column(UUID(as_uuid=True), ForeignKey("property_links.id"))
    
    visitor_hash = Column(String(64))
    device_type = Column(String(20))
    os = Column(String(50))
    browser = Column(String(50))
    city = Column(String(100))
    referrer = Column(String(500))
    
    duration_seconds = Column(Integer, default=0)
    photos_viewed = Column(Integer, default=0)
    phone_clicked = Column(Boolean, default=False)
    whatsapp_clicked = Column(Boolean, default=False)
    
    viewed_at = Column(DateTime, default=func.now())
