from datetime import datetime
from typing import Optional

from beanie import Document


class Project(Document):
    idea: str
    stack: dict
    user_id: str
    is_public: bool = True
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()
    deleted_at: Optional[datetime] = None
