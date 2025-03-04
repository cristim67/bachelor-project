from pydantic import BaseModel


class Stack(BaseModel):
    apiType: str
    language: str
    framework: str
    database: str
    frontend: str
    css: str
    projectType: str


class ProjectInput(BaseModel):
    idea: str
    is_public: bool = True
    stack: Stack
