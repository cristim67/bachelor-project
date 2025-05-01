from datetime import datetime
from typing import Optional

from beanie import Document


class Project(Document):
    idea: str
    user_id: str
    is_public: bool = True
    s3_folder_name: Optional[str] = None
    s3_presigned_url: Optional[str] = None
    db_uri: Optional[str] = None
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()
    deleted_at: Optional[datetime] = None
