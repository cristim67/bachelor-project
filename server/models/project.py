from beanie import Document
from datetime import datetime
from typing import Optional


class Project(Document):
    idea: str
    stack: dict
    user_id: str
    is_public: bool = True
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()
    deleted_at: Optional[datetime] = None
