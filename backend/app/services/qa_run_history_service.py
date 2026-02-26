import redis
import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.core.config import get_settings

settings = get_settings()


class QARunHistoryService:
    """Service for managing QA run history in Redis."""

    def __init__(self):
        self.redis_client = redis.from_url(settings.redis_url)
        self.ttl_seconds = 7 * 24 * 3600  # 1 week

    def save_run(
        self,
        job_id: str,
        name: str,
        status: str,
        job_type: str,
        parent_run_id: Optional[str] = None
    ) -> str:
        """
        Save a QA run to history.

        Args:
            job_id: The job identifier
            name: 11-word summary of the test case
            status: passed, unsuccessful, failed, etc.
            job_type: generate, execute, or replay
            parent_run_id: If this is a replay, the ID of the original run

        Returns:
            The generated run_id
        """
        run_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()

        run_data = {
            "run_id": run_id,
            "job_id": job_id,
            "name": name,
            "status": status,
            "job_type": job_type,
            "timestamp": timestamp,
            "parent_run_id": parent_run_id or ""
        }

        # Save run data
        self.redis_client.hset(
            f"qa_run:{run_id}",
            mapping=run_data
        )
        self.redis_client.expire(f"qa_run:{run_id}", self.ttl_seconds)

        # Add to sorted set index (sorted by timestamp)
        timestamp_score = datetime.utcnow().timestamp()
        self.redis_client.zadd("qa_runs:index", {run_id: timestamp_score})

        # If this is a replay, add it to parent's replay list
        if parent_run_id:
            self.redis_client.rpush(f"qa_run:{parent_run_id}:replays", run_id)
            self.redis_client.expire(f"qa_run:{parent_run_id}:replays", self.ttl_seconds)

        return run_id

    def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Get a single run by ID."""
        run_data = self.redis_client.hgetall(f"qa_run:{run_id}")
        if not run_data:
            return None

        # Convert bytes to strings
        run = {k.decode('utf-8'): v.decode('utf-8') for k, v in run_data.items()}

        # Get replay count
        replay_count = self.redis_client.llen(f"qa_run:{run_id}:replays")
        run["replay_count"] = replay_count

        return run

    def get_all_runs(self) -> List[Dict[str, Any]]:
        """
        Get all runs sorted by timestamp (newest first).
        Returns runs organized by parent-child relationships.
        """
        # Get all run IDs sorted by timestamp (newest first)
        run_ids = self.redis_client.zrevrange("qa_runs:index", 0, -1)

        runs = []
        for run_id in run_ids:
            run_id_str = run_id.decode('utf-8')
            run = self.get_run(run_id_str)
            if run:
                # Get replays for this run
                replay_ids = self.redis_client.lrange(f"qa_run:{run_id_str}:replays", 0, -1)
                replays = []
                for replay_id in replay_ids:
                    replay = self.get_run(replay_id.decode('utf-8'))
                    if replay:
                        replays.append(replay)

                run["replays"] = replays
                runs.append(run)

        # Filter out runs that are replays (they're already nested)
        top_level_runs = [r for r in runs if not r.get("parent_run_id")]

        return top_level_runs

    def delete_run(self, run_id: str) -> bool:
        """Delete a run and its replays."""
        # Delete replays first
        replay_ids = self.redis_client.lrange(f"qa_run:{run_id}:replays", 0, -1)
        for replay_id in replay_ids:
            replay_id_str = replay_id.decode('utf-8')
            self.redis_client.delete(f"qa_run:{replay_id_str}")
            self.redis_client.zrem("qa_runs:index", replay_id_str)

        # Delete replay list
        self.redis_client.delete(f"qa_run:{run_id}:replays")

        # Delete the run itself
        self.redis_client.delete(f"qa_run:{run_id}")
        self.redis_client.zrem("qa_runs:index", run_id)

        return True

    @staticmethod
    def generate_run_name(test_case_text: str) -> str:
        """
        Generate an 11-word summary from test case description.
        Takes first sentence and truncates to 11 words max.
        """
        if not test_case_text:
            return "Untitled Test Case"

        # Get first sentence or first 100 chars
        first_sentence = test_case_text.split('.')[0][:100]

        # Split into words
        words = first_sentence.split()

        # Take first 11 words
        summary_words = words[:11]
        summary = ' '.join(summary_words)

        # Add ellipsis if truncated
        if len(words) > 11:
            summary += "..."

        return summary
