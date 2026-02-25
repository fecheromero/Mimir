from enum import Enum


class JobStatus(str, Enum):
    """Job execution statuses"""
    # Generation statuses
    GENERATING = "generating"
    GENERATED = "generated"

    # Execution statuses
    EXECUTING = "executing"
    PASSED = "passed"
    UNSUCCESSFUL = "unsuccessful"

    # Error statuses
    FAILED = "failed"

    # Legacy (for backward compatibility)
    COMPLETED = "completed"
    PROCESSING = "processing"

    @classmethod
    def terminal_statuses(cls) -> list[str]:
        """Statuses that indicate job completion"""
        return [
            cls.GENERATED.value,
            cls.PASSED.value,
            cls.UNSUCCESSFUL.value,
            cls.FAILED.value,
            cls.COMPLETED.value
        ]

    @classmethod
    def success_statuses(cls) -> list[str]:
        """Statuses indicating successful completion"""
        return [
            cls.GENERATED.value,
            cls.PASSED.value,
            cls.COMPLETED.value
        ]

    @classmethod
    def failure_statuses(cls) -> list[str]:
        """Statuses indicating failure"""
        return [
            cls.UNSUCCESSFUL.value,
            cls.FAILED.value
        ]
