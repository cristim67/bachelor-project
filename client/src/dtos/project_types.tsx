export interface ProjectType {
  idea: string;
  stack: {
    apiType?: string;
    language?: string;
    framework?: string;
    database?: string;
    frontend?: string;
    css?: string;
    projectType?: string;
  };
  is_public: boolean;
}
