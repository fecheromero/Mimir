from celery import Celery
from celery.schedules import crontab
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "mimir",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.workers.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes max
    task_soft_time_limit=25 * 60,  # 25 minutes soft limit
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
)

# Periodic tasks
celery_app.conf.beat_schedule = {
    "cleanup-old-jobs": {
        "task": "app.workers.tasks.cleanup_old_jobs",
        "schedule": crontab(minute=0),  # Every hour
    },
}
