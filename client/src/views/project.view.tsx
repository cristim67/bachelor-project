import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/auth_context";
import { useNavigate } from "react-router-dom";
import sdk from "@stackblitz/sdk";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../contexts/theme_provider";
import JSZip from "jszip";
import {
  generateProject,
  getProject,
  generateBackendRequirements,
  checkProjectS3,
} from "../network/api_axios";
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
  const [requirements, setRequirements] = useState<string>("");
  const [isGeneratingRequirements, setIsGeneratingRequirements] =
    useState(false);
  const [isGeneratingProject, setIsGeneratingProject] = useState(false);
  const requirementsRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (requirementsRef.current) {
      requirementsRef.current.scrollTop = requirementsRef.current.scrollHeight;
    }
  }, [requirements, isGeneratingRequirements]);

  const generateRequirements = async () => {
    const projectData = JSON.parse(localStorage.getItem("project") || "{}");
    if (!id) return;

    if (projectData.prompt && !requirements) {
      setIsGeneratingRequirements(true);
      setRequirements("");
      try {
        console.log("Starting requirements generation...");
        // First step: Generate backend requirements with streaming
        let finalRequirements = "";
        const streamPromise = new Promise<void>((resolve, reject) => {
          let allRequirements = "";
          generateBackendRequirements(projectData.prompt, id, (chunk) => {
            allRequirements += chunk;
            setRequirements(allRequirements);
            // Force a re-render by using setTimeout
            requestAnimationFrame(() => {
              if (requirementsRef.current) {
                requirementsRef.current.scrollTop =
                  requirementsRef.current.scrollHeight;
              }
            });
          })
            .then(() => {
              console.log("Stream completed");
              finalRequirements = allRequirements;
              resolve();
            })
            .catch((error) => {
              console.error("Stream error:", error);
              reject(error);
            });
        });

        // Wait for the stream to complete
        await streamPromise;
        console.log("Requirements generation completed");

        // Second step: Generate project with the requirements
        setIsGeneratingRequirements(false);
        setIsGeneratingProject(true);

        console.log("Starting project generation...");
        // Only generate project if we have valid requirements
        if (finalRequirements && finalRequirements.trim()) {
          await generateProject(finalRequirements, id);
          console.log("Project generation completed");
        } else {
          console.error("No valid requirements generated");
          throw new Error("No valid requirements generated");
        }

        // After project generation, check S3 again for the new files
        console.log("Checking S3 after project generation...");
        const updatedS3Info = await checkProjectS3(id);
        console.log("Updated S3 Info:", updatedS3Info);

        if (
          updatedS3Info &&
          updatedS3Info.s3_info &&
          updatedS3Info.s3_info.s3_presigned_url
        ) {
          console.log("Downloading project files...");
          const s3Response = await axios.get(
            updatedS3Info.s3_info.s3_presigned_url,
            {
              responseType: "arraybuffer",
            },
          );
          const zip = new JSZip();
          await zip.loadAsync(s3Response.data);
          const files: Record<string, string> = {};

          // Get all files from the zip
          for (const [filename, file] of Object.entries(zip.files)) {
            if (!file.dir) {
              const content = await file.async("string");
              files[filename] = content;
            }
          }

          // Get code.zip from the code directory
          const codeZipFile = files["code/code.zip"];
          if (!codeZipFile) {
            throw new Error("Code zip not found in project");
          }

          // Create a new JSZip instance for the code.zip content
          const codeZip = new JSZip();
          await codeZip.loadAsync(codeZipFile);

          // Extract files from code.zip
          const codeFiles: Record<string, string> = {};
          for (const [filename, file] of Object.entries(codeZip.files)) {
            if (!file.dir) {
              const content = await file.async("string");
              codeFiles[filename] = content;
            }
          }

          const fileStructures: FileStructure[] = Object.entries(codeFiles).map(
            ([path, content]) => ({
              type: "file" as const,
              path: `./${path}`,
              content,
            }),
          );

          const newProject: ProjectStructure = {
            structure: fileStructures,
          };

          setProject(newProject);
          console.log("Project loaded into state");

          // Show in Stackblitz only after all files are loaded
          if (editorRef.current) {
            try {
              sdk.embedProject(
                editorRef.current,
                {
                  files: convertToStackblitzFiles(fileStructures),
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
        }
      } catch (error) {
        console.error("Error generating project:", error);
      } finally {
        setIsGeneratingRequirements(false);
        setIsGeneratingProject(false);
      }
    }
  };

  useFetchOnce(async () => {
    if (!id) return;
    try {
      console.log("Starting initial S3 check for project:", id);
      const s3Response = await checkProjectS3(id);
      console.log("S3 check response:", s3Response);

      if (s3Response && s3Response.s3_info) {
        // If we get a 200 but no s3_presigned_url, start requirements generation
        if (!s3Response.s3_info.s3_presigned_url) {
          console.log(
            "No project files found, starting requirements generation",
          );
          const projectData = JSON.parse(
            localStorage.getItem("project") || "{}",
          );
          if (projectData.prompt) {
            await generateRequirements();
            return;
          }
        } else {
          console.log("Found project URL, downloading files...");
          try {
            const projectResponse = await axios.get(
              s3Response.s3_info.s3_presigned_url,
              {
                responseType: "arraybuffer",
              },
            );
            console.log("Project files downloaded successfully");

            const projectZip = new JSZip();
            await projectZip.loadAsync(projectResponse.data);
            console.log("Project ZIP loaded, checking contents...");

            // Get all files from the zip
            const files: Record<string, string> = {};
            for (const [filename, file] of Object.entries(projectZip.files)) {
              if (!file.dir) {
                const content = await file.async("string");
                files[filename] = content;
              }
            }
            console.log("Available files in ZIP:", Object.keys(files));

            // Check conversation.jsonl first
            const requirementsFile = files["history/conversation.jsonl"];
            if (requirementsFile) {
              console.log("Found conversation.jsonl, checking messages...");
              const requirementsContent = requirementsFile;
              const requirementsLines = requirementsContent.split("\n");

              // Check if we need to generate requirements
              if (requirementsLines.length > 0) {
                const firstMessage = JSON.parse(requirementsLines[0]);
                console.log("First message:", firstMessage);

                if (firstMessage.role === "user" && firstMessage.content) {
                  console.log(
                    "Found user message, checking if requirements need generation",
                  );
                  const projectData = JSON.parse(
                    localStorage.getItem("project") || "{}",
                  );
                  projectData.prompt = firstMessage.content;
                  localStorage.setItem("project", JSON.stringify(projectData));

                  // Check if we need to generate requirements
                  const lastMessage = JSON.parse(
                    requirementsLines[requirementsLines.length - 1],
                  );
                  console.log("Last message:", lastMessage);

                  if (
                    lastMessage.role === "assistant" &&
                    !lastMessage.content
                  ) {
                    console.log(
                      "Assistant message is empty, starting requirements generation",
                    );
                    await generateRequirements();
                    return;
                  } else {
                    console.log(
                      "Assistant message exists, displaying conversation",
                    );
                  }
                }
              }

              // Display existing conversation
              const allMessages = requirementsLines
                .filter((line) => line.trim())
                .map((line) => {
                  try {
                    const message = JSON.parse(line);
                    if (message.role === "user") {
                      return `### User:\n${message.content}\n\n`;
                    } else {
                      const content = message.content
                        .replace(/### (.*?):/g, "\n### $1:\n")
                        .replace(/- \*\*(.*?)\*\*:/g, "\n- **$1**:")
                        .replace(/\n\n/g, "\n")
                        .replace(/\n/g, "\n  ");
                      return `### Assistant:\n${content}\n\n`;
                    }
                  } catch (e) {
                    console.error("Error parsing message:", e);
                    return "";
                  }
                })
                .join("");

              setRequirements(allMessages);
            } else {
              console.log("No conversation.jsonl found in project");
            }

            // Check if we need to generate project
            const structureFile = files["structure/project.json"];
            const codeZipFile = projectZip.file("code.zip");

            console.log("Checking project files:", {
              hasStructureFile: !!structureFile,
              hasCodeZip: !!codeZipFile,
            });

            if (!structureFile || !codeZipFile) {
              console.log("Missing project files, starting project generation");
              const projectData = JSON.parse(
                localStorage.getItem("project") || "{}",
              );
              if (projectData.prompt) {
                setIsGeneratingProject(true);
                await generateProject(projectData.prompt, id);
                return;
              }
            } else {
              console.log("Loading existing project into Stackblitz");
              if (codeZipFile) {
                const codeZipContent = await codeZipFile.async("arraybuffer");
                const codeZip = new JSZip();
                await codeZip.loadAsync(codeZipContent);

                const projectFiles: Record<string, string> = {};
                for (const [filename, file] of Object.entries(codeZip.files)) {
                  if (!file.dir) {
                    const content = await file.async("string");
                    projectFiles[filename] = content;
                  }
                }
                console.log(
                  "Loaded files from code.zip:",
                  Object.keys(projectFiles),
                );

                const fileStructures: FileStructure[] = Object.entries(
                  projectFiles,
                ).map(([path, content]) => ({
                  type: "file" as const,
                  path: `./${path}`,
                  content,
                }));

                const newProject: ProjectStructure = {
                  structure: fileStructures,
                };

                setProject(newProject);
                console.log("Project loaded into state");

                // Show in Stackblitz only after all files are loaded
                if (editorRef.current) {
                  try {
                    sdk.embedProject(
                      editorRef.current,
                      {
                        files: convertToStackblitzFiles(fileStructures),
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
              }
            }
          } catch (error: unknown) {
            console.error("Error loading project files:", error);
            if (error && typeof error === "object" && "response" in error) {
              const axiosError = error as {
                response: { status: number; data: unknown };
              };
              console.error(
                "Error response:",
                axiosError.response.status,
                axiosError.response.data,
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking project S3:", error);
    }
  }, [id, generateRequirements]);

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
        {isGeneratingRequirements && (
          <div className="p-4 rounded-lg shadow mb-4">
            <div className="flex items-center gap-2">
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
              <span>Generating requirements...</span>
            </div>
            <pre
              ref={requirementsRef}
              className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-96 text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words text-sm"
            >
              {requirements}
            </pre>
          </div>
        )}
        {!isGeneratingRequirements && requirements && (
          <div className="p-4 rounded-lg shadow mb-4">
            <div className="flex items-center gap-2">
              <span>Backend Requirements</span>
            </div>
            <pre
              ref={requirementsRef}
              className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-96 text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words text-sm"
            >
              {requirements}
            </pre>
          </div>
        )}
      </div>
      <div
        ref={editorRef}
        id="embed-stackblitz"
        className="w-1/2 h-[calc(100vh-64px)] border-l border-gray-200 overflow-hidden bg-[#1e1e1e] relative"
      >
        {isGeneratingProject && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e] bg-opacity-90 z-50">
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
              <span className="text-white text-lg">
                Generating project files...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
