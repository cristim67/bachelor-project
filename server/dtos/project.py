from pydantic import BaseModel

class Stack(BaseModel):
    apiType: str
    language: str
    framework: str
    database: str
    frontend: str
    css: str
    projectType: str

    def dict(self):
        return {
            "apiType": self.apiType,
            "language": self.language,
            "framework": self.framework,
            "database": self.database,
            "frontend": self.frontend,
            "css": self.css,
            "projectType": self.projectType
        }

class ProjectInput(BaseModel):
    idea: str
    is_public: bool = True
    stack: Stack

