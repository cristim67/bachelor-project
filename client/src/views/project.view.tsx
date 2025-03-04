import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/auth_context";
import { useNavigate } from "react-router-dom";
import sdk from "@stackblitz/sdk";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../contexts/theme_provider";
import JSZip from "jszip";
import { generateProject, getProject } from "../network/api_axios";
import axios from "axios";
import { useFetchOnce } from "../hooks/useFetchOnce";

interface FileStructure {
  type: "file" | "directory";
  path: string;
  content: string | null;
}

interface ProjectStructure {
  structure: FileStructure[];
}

export const Project = () => {
  const { isLoggedIn, isLoading } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const editorRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [isDownloading, setIsDownloading] = useState(false);
  const [project, setProject] = useState<ProjectStructure | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useFetchOnce(async () => {
    if (!id) return;
    try {
      const response = await getProject(id);
      if (response && response.project && response.project.s3_presigned_url) {
        const project = response.project;
        if (project.s3_presigned_url) {
          try {
            const s3Response = await axios.get(project.s3_presigned_url, {
              responseType: "arraybuffer",
            });
            const zip = new JSZip();
            await zip.loadAsync(s3Response.data);
            const files: Record<string, string> = {};

            for (const [filename, file] of Object.entries(zip.files)) {
              if (!file.dir) {
                const content = await file.async("string");
                files[filename] = content;
              }
            }

            setProject({
              structure: Object.entries(files).map(([path, content]) => ({
                type: "file",
                path: `./${path}`,
                content,
              })),
            });
          } catch (error) {
            console.error("Error loading project files:", error);
          }
        } else {
          setProject(project);
        }
        return;
      }
    } catch (error) {
      console.error("Error fetching project:", error);
    }

    const projectData = JSON.parse(localStorage.getItem("project") || "{}");
    if (
      projectData.prompt &&
      (!projectData.s3_presigned_url || !projectData.s3_folder_name)
    ) {
      setIsGenerating(true);
      try {
        await generateProject(projectData.prompt, id);

        const updatedProject = await getProject(id);
        if (
          updatedProject &&
          updatedProject.project &&
          updatedProject.project.s3_presigned_url
        ) {
          const s3Response = await axios.get(
            updatedProject.project.s3_presigned_url,
            {
              responseType: "arraybuffer",
            },
          );
          const zip = new JSZip();
          await zip.loadAsync(s3Response.data);
          const files: Record<string, string> = {};

          for (const [filename, file] of Object.entries(zip.files)) {
            if (!file.dir) {
              const content = await file.async("string");
              files[filename] = content;
            }
          }

          setProject({
            structure: Object.entries(files).map(([path, content]) => ({
              type: "file",
              path: `./${path}`,
              content,
            })),
          });
        }
      } catch (error) {
        console.error("Error generating project:", error);
      } finally {
        setIsGenerating(false);
      }
    }
  }, [id]);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      navigate("/auth/login");
    }
  }, [isLoggedIn, isLoading, navigate]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await getProject(id || "");
      if (response && response.project && response.project.s3_presigned_url) {
        const s3Response = await axios.get(response.project.s3_presigned_url, {
          responseType: "blob",
        });

        const url = window.URL.createObjectURL(s3Response.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = `project-${id}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const convertToStackblitzFiles = (
    structure: FileStructure[],
  ): Record<string, string> => {
    const files: Record<string, string> = {};
    structure.forEach((item) => {
      if (item.type === "file") {
        files[item.path.replace("./", "")] = item.content || "";
      }
    });
    return files;
  };

  useEffect(() => {
    if (editorRef.current && project) {
      try {
        sdk.embedProject(
          editorRef.current,
          {
            files: convertToStackblitzFiles(project.structure),
            title: "Python Project",
            description: "Python FastAPI Project Viewer",
            template: "node",
            settings: {
              compile: {
                trigger: "auto",
              },
            },
          },
          {
            height: "100%",
            showSidebar: true,
            view: "editor",
            theme: "dark",
            hideNavigation: true,
          },
        );
      } catch (error) {
        console.error("Failed to embed Stackblitz project:", error);
      }
    }
  }, [project]);

  return (
    <div className="flex min-h-screen pt-16">
      <div className="w-1/2 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="p-4 rounded-lg shadow">
            <p>Project ID: {id}</p>
          </div>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`px-4 py-2 transition-colors rounded-md flex items-center gap-2 text-sm
              ${
                theme === "light"
                  ? "border-black border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
                  : "border-white border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
              }`}
          >
            {isDownloading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>Download ZIP</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div
        ref={editorRef}
        id="embed-stackblitz"
        className="w-1/2 h-[calc(100vh-64px)] border-l border-gray-200 overflow-hidden bg-[#1e1e1e] relative"
      >
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e] bg-opacity-90">
            <div className="flex flex-col items-center gap-4">
              <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-white">Generating project...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
