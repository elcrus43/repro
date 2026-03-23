from celery import Celery
from .config import settings

celery_app = Celery(
    "realtor_crm",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.task_routes = {
    "app.tasks.*": {"queue": "default"},
}

celery_app.autodiscover_tasks(["app.tasks"])
