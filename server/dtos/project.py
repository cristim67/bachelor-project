from pydantic import BaseModel


class ProjectInput(BaseModel):
    idea: str
    is_public: bool = True
