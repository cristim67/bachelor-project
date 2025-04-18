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
  const [userInput, setUserInput] = useState<string>("");
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

        let finalRequirements = "";
        const streamPromise = new Promise<void>((resolve, reject) => {
          let allRequirements = "";
          generateBackendRequirements(projectData.prompt, id, (chunk) => {
            allRequirements += chunk;
            setRequirements(allRequirements);
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

        await streamPromise;
        console.log("Requirements generation completed");

        setIsGeneratingRequirements(false);
        setIsGeneratingProject(true);

        console.log("Starting project generation...");
        if (finalRequirements && finalRequirements.trim()) {
          await generateProject(finalRequirements, id);
          console.log("Project generation completed");
          setIsGeneratingProject(false);

          await new Promise((resolve) => setTimeout(resolve, 2000));
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

            // Create a new JSZip instance and load the response data
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

            console.log("Available files in ZIP:", Object.keys(files));

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

            console.log("Files in code.zip:", Object.keys(codeFiles));

            const fileStructures: FileStructure[] = Object.entries(
              codeFiles,
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
        } else {
          console.error("No valid requirements generated");
          throw new Error("No valid requirements generated");
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
      console.log("S3 presigned url:", s3Response.s3_info.s3_presigned_url);

      if (s3Response && s3Response.s3_info) {
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

            const files: Record<string, string> = {};
            for (const [filename, file] of Object.entries(projectZip.files)) {
              if (!file.dir) {
                const content = await file.async("string");
                files[filename] = content;
              }
            }
            console.log("Available files in ZIP:", Object.keys(files));

            const requirementsFile = files["history/conversation.jsonl"];
            if (requirementsFile) {
              console.log("Found conversation.jsonl, checking messages...");
              const requirementsContent = requirementsFile;
              const requirementsLines = requirementsContent.split("\n");

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

            const structureFile = files["structure/project.json"];
            const codeZipFile = files["code/code.zip"];

            console.log("Checking project files:", {
              hasStructureFile: !!structureFile,
              hasCodeZip: !!codeZipFile,
            });

            if (!structureFile) {
              console.log("Missing project files, starting project generation");
              const projectData = JSON.parse(
                localStorage.getItem("project") || "{}",
              );
              if (projectData.prompt) {
                setIsGeneratingProject(true);
                await generateProject(projectData.prompt, id);
                console.log("Project generation completed");
                setIsGeneratingProject(false);

                await new Promise((resolve) => setTimeout(resolve, 2000));
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

                  for (const [filename, file] of Object.entries(zip.files)) {
                    if (!file.dir) {
                      const content = await file.async("string");
                      files[filename] = content;
                    }
                  }

                  console.log("Available files in ZIP:", Object.keys(files));

                  const codeZipFile = files["code/code.zip"];
                  if (!codeZipFile) {
                    throw new Error("Code zip not found in project");
                  }

                  const codeZip = new JSZip();
                  const zipResponse = await axios.get(
                    updatedS3Info.s3_info.s3_presigned_url,
                    {
                      responseType: "arraybuffer",
                    },
                  );
                  await codeZip.loadAsync(zipResponse.data);

                  const innerZipFile = codeZip.file("code/code.zip");
                  if (!innerZipFile) {
                    throw new Error("Code zip not found in project");
                  }

                  const innerCodeZip = new JSZip();
                  const innerZipContent = await innerZipFile.async(
                    "arraybuffer",
                  );
                  await innerCodeZip.loadAsync(innerZipContent);

                  const codeFiles: Record<string, string> = {};
                  for (const [filename, file] of Object.entries(
                    innerCodeZip.files,
                  )) {
                    if (!file.dir) {
                      try {
                        const content = await file.async("string");
                        const cleanPath = filename.replace(/^\.?\//, "");
                        codeFiles[cleanPath] = content;
                      } catch (error) {
                        console.error(
                          `Error extracting file ${filename}:`,
                          error,
                        );
                        continue;
                      }
                    }
                  }

                  console.log("All files in code.zip:", Object.keys(codeFiles));

                  if (Object.keys(codeFiles).length === 0) {
                    throw new Error(
                      "No files could be extracted from code.zip",
                    );
                  }

                  const fileStructures: FileStructure[] = Object.entries(
                    codeFiles,
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

                  if (editorRef.current) {
                    try {
                      const stackblitzFiles =
                        convertToStackblitzFiles(fileStructures);
                      console.log(
                        "Stackblitz files:",
                        Object.keys(stackblitzFiles),
                      );

                      sdk.embedProject(
                        editorRef.current,
                        {
                          files: stackblitzFiles,
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
                      console.error(
                        "Failed to embed Stackblitz project:",
                        error,
                      );
                    }
                  }
                }
                return;
              }
            } else {
              console.log("Loading existing project into Stackblitz");
              if (codeZipFile) {
                try {
                  const codeZip = new JSZip();
                  const zipResponse = await axios.get(
                    s3Response.s3_info.s3_presigned_url,
                    {
                      responseType: "arraybuffer",
                    },
                  );
                  await codeZip.loadAsync(zipResponse.data);

                  const innerZipFile = codeZip.file("code/code.zip");
                  if (!innerZipFile) {
                    throw new Error("Code zip not found in project");
                  }

                  const innerCodeZip = new JSZip();
                  const innerZipContent = await innerZipFile.async(
                    "arraybuffer",
                  );
                  await innerCodeZip.loadAsync(innerZipContent);

                  const codeFiles: Record<string, string> = {};
                  for (const [filename, file] of Object.entries(
                    innerCodeZip.files,
                  )) {
                    if (!file.dir) {
                      try {
                        const content = await file.async("string");
                        const cleanPath = filename.replace(/^\.?\//, "");
                        codeFiles[cleanPath] = content;
                      } catch (error) {
                        console.error(
                          `Error extracting file ${filename}:`,
                          error,
                        );
                        continue;
                      }
                    }
                  }

                  console.log("All files in code.zip:", Object.keys(codeFiles));

                  if (Object.keys(codeFiles).length === 0) {
                    throw new Error(
                      "No files could be extracted from code.zip",
                    );
                  }

                  const fileStructures: FileStructure[] = Object.entries(
                    codeFiles,
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

                  if (editorRef.current) {
                    try {
                      const stackblitzFiles =
                        convertToStackblitzFiles(fileStructures);
                      console.log(
                        "Stackblitz files:",
                        Object.keys(stackblitzFiles),
                      );

                      sdk.embedProject(
                        editorRef.current,
                        {
                          files: stackblitzFiles,
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
                      console.error(
                        "Failed to embed Stackblitz project:",
                        error,
                      );
                    }
                  }
                } catch (error) {
                  console.error("Error processing code.zip:", error);
                  throw error;
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
        const cleanPath = item.path.replace(/^\.?\//, "");
        files[cleanPath] = item.content || "";
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

  const handleSendMessage = () => {
    console.log("User message:", userInput);
    setUserInput("");
  };

  return (
    <div className="flex min-h-screen pt-16">
      <div className="w-1/2 p-4">
        {isGeneratingRequirements && (
          <div
            className={`p-4 rounded-lg shadow mb-4 ${
              theme === "light"
                ? "bg-white border border-black"
                : "bg-gray-800 border border-button-color"
            }`}
          >
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
              <span
                className={theme === "light" ? "text-black" : "text-gray-100"}
              >
                Generating requirements...
              </span>
            </div>
            <pre
              ref={requirementsRef}
              className={`mt-4 p-4 rounded overflow-auto max-h-[500px] whitespace-pre-wrap break-words text-sm ${
                theme === "light"
                  ? "bg-white text-black border border-black"
                  : "bg-gray-700 text-gray-100 border border-button-color"
              }`}
            >
              {requirements}
            </pre>
          </div>
        )}
        {!isGeneratingRequirements && requirements && (
          <div
            className={`p-4 rounded-lg shadow mb-4 ${
              theme === "light"
                ? "bg-white border border-black"
                : "bg-gray-800 border border-button-color"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span
                className={theme === "light" ? "text-black" : "text-gray-100"}
              >
                Backend Requirements
              </span>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className={`px-4 py-2 transition-colors rounded-md flex items-center gap-2 text-sm
                  ${
                    theme === "light"
                      ? "border-black border-[1px] bg-white text-black hover:bg-gray-100"
                      : "border-button-color border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
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
            <pre
              ref={requirementsRef}
              className={`p-4 rounded overflow-auto max-h-[500px] whitespace-pre-wrap break-words text-sm ${
                theme === "light"
                  ? "bg-white text-black border border-black"
                  : "bg-gray-700 text-gray-100 border border-button-color"
              }`}
            >
              {requirements}
            </pre>
          </div>
        )}
        <div
          className={`rounded-2xl shadow-lg ${
            theme === "light"
              ? "bg-white border border-black"
              : "bg-[#2f3136] border border-[#1e1f22]"
          }`}
        >
          <div className="flex flex-row gap-2 p-2 items-center">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your message here..."
              className={`w-full px-4 py-3 rounded-xl focus:outline-none resize-none ${
                theme === "light"
                  ? "bg-white text-black placeholder-gray-500 border border-black"
                  : "bg-[#383a40] text-gray-200 placeholder-gray-400 border-none"
              }`}
              rows={1}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button
              onClick={handleSendMessage}
              className={`px-6 rounded-xl flex items-center gap-2 text-base font-medium h-[42px]
                ${
                  theme === "light"
                    ? "bg-white text-black hover:bg-gray-100 border border-black"
                    : "bg-[#383a40] text-gray-200 hover:bg-[#404249] border-none"
                }`}
            >
              <span>Send</span>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
          </div>
        </div>
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
