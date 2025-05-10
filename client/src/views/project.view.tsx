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
  deployProject,
} from "../network/api_axios";
import axios from "axios";
import { useFetchOnce } from "../hooks/useFetchOnce";
import { VM } from "@stackblitz/sdk";
import { format } from "prettier/standalone";
import { toast } from "react-toastify";

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
  const [isDeploying, setIsDeploying] = useState(false);
  const [project, setProject] = useState<ProjectStructure | null>(null);
  const [requirements, setRequirements] = useState<string>("");
  const [isGeneratingRequirements, setIsGeneratingRequirements] =
    useState(false);
  const [isGeneratingProject, setIsGeneratingProject] = useState(false);
  const [userInput, setUserInput] = useState<string>("");
  const [showUrlsModal, setShowUrlsModal] = useState(false);
  const [deploymentUrls, setDeploymentUrls] = useState<{
    deployment_url: string;
    database_uri: string;
  } | null>(null);
  const [finalDeploymentUrl, setFinalDeploymentUrl] = useState<string>("");
  const requirementsRef = useRef<HTMLPreElement>(null);
  const [vm, setVm] = useState<VM | null>(null);

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
          window.location.reload();
          // Add retry logic for S3 download
          let retryCount = 0;
          const maxRetries = 3;
          const retryDelay = 5000; // 5 seconds

          while (retryCount < maxRetries) {
            try {
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
              console.log(
                `Checking S3 after project generation (attempt ${
                  retryCount + 1
                })...`,
              );
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
                    timeout: 60000, // 60 second timeout
                  },
                );

                // Verify the response data
                if (!s3Response.data || s3Response.data.length === 0) {
                  throw new Error("Empty response from S3");
                }

                try {
                  // Create a new JSZip instance and load the response data
                  const zip = new JSZip();
                  await zip.loadAsync(s3Response.data);

                  // Verify the zip file is not corrupted
                  if (Object.keys(zip.files).length === 0) {
                    throw new Error("Corrupted zip: No files found in archive");
                  }

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
                  for (const [filename, file] of Object.entries(
                    codeZip.files,
                  )) {
                    if (!file.dir) {
                      const content = await file.async("string");
                      codeFiles[filename] = content;
                    }
                  }

                  console.log("All files in code.zip:", Object.keys(codeFiles));

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
                    embedStackblitzProject(fileStructures);
                  }

                  // If we get here, everything worked - break the retry loop
                  break;
                } catch (error: unknown) {
                  console.error("Error processing code.zip:", error);
                  throw error;
                }
              }
            } catch (error: unknown) {
              console.error(`Attempt ${retryCount + 1} failed:`, error);
              retryCount++;
              if (retryCount === maxRetries) {
                throw new Error(
                  `Failed to download project after ${maxRetries} attempts: ${
                    error instanceof Error ? error.message : String(error)
                  }`,
                );
              }
            }
          }
        } else {
          console.error("No valid requirements generated");
          throw new Error("No valid requirements generated");
        }
      } catch (error) {
        console.error("Error generating project:", error);
        throw error; // Re-throw to be caught by the outer try-catch
      } finally {
        setIsGeneratingRequirements(false);
        setIsGeneratingProject(false);
      }
    }
  };

  useFetchOnce(async () => {
    if (!id) return;
    try {
      // Add a small delay to ensure project is fully created
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log("Starting initial S3 check for project:", id);
      const s3Response = await checkProjectS3(id);
      console.log("S3 check response:", s3Response);
      console.log("S3 presigned url:", s3Response.s3_info.s3_presigned_url);

      // Check if project has deployment URL
      const projectResponse = await getProject(id);
      if (
        projectResponse &&
        projectResponse.project &&
        projectResponse.project.deployment_url
      ) {
        const baseUrl = projectResponse.project.deployment_url;
        const finalUrl = await checkApiDocs(baseUrl);
        setFinalDeploymentUrl(finalUrl);
        setDeploymentUrls({
          deployment_url: baseUrl,
          database_uri: projectResponse.project.database_uri || "",
        });
      }

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
                  const innerZipContent =
                    await innerZipFile.async("arraybuffer");
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
                        // If this is the .env file, create .stackblitzrc from it
                        if (cleanPath === ".env") {
                          const envVars = content
                            .split("\n")
                            .filter(
                              (line) => line.trim() && !line.startsWith("#"),
                            )
                            .reduce(
                              (acc, line) => {
                                const [key, value] = line.split("=");
                                if (key && value) {
                                  acc[key.trim()] = value.trim();
                                }
                                return acc;
                              },
                              {} as Record<string, string>,
                            );

                          codeFiles[".stackblitzrc"] = JSON.stringify(
                            {
                              startCommand: "npm start",
                              env: envVars,
                            },
                            null,
                            2,
                          );
                        }
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
                    embedStackblitzProject(fileStructures);
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
                  const innerZipContent =
                    await innerZipFile.async("arraybuffer");
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

                        // If this is the .env file, create .stackblitzrc from it
                        if (cleanPath === ".env") {
                          const envVars = content
                            .split("\n")
                            .filter(
                              (line) => line.trim() && !line.startsWith("#"),
                            )
                            .reduce(
                              (acc, line) => {
                                const [key, value] = line.split("=");
                                if (key && value) {
                                  acc[key.trim()] = value.trim();
                                }
                                return acc;
                              },
                              {} as Record<string, string>,
                            );

                          codeFiles[".stackblitzrc"] = JSON.stringify(
                            {
                              startCommand: "npm start",
                              env: envVars,
                            },
                            null,
                            2,
                          );
                        }
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
                    embedStackblitzProject(fileStructures);
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
  }, [id, generateRequirements, theme]);

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

        const zip = new JSZip();
        await zip.loadAsync(s3Response.data);

        // Get the code.zip file from the code directory
        const codeZipFile = zip.file("code/code.zip");
        if (!codeZipFile) {
          throw new Error("Code zip not found in project");
        }

        // Create a new blob with just the code.zip content
        const codeZipBlob = await codeZipFile.async("blob");
        const url = window.URL.createObjectURL(codeZipBlob);
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

  const checkApiDocs = async (baseUrl: string) => {
    try {
      const response = await axios.get(`${baseUrl}/api/docs`);
      if (response.status === 200) {
        return `${baseUrl}/api/docs`;
      }
    } catch (error) {
      console.error("Error checking /api/docs:", error);
    }
    return baseUrl;
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      const response = await getProject(id || "");
      if (response && response.project && response.project.s3_presigned_url) {
        const deployResponse = await deployProject(
          response.project.s3_presigned_url,
          response.project.name,
          response.project.region,
          response.project._id,
          response.project.database_name,
        );
        if (deployResponse.status === "success") {
          const baseUrl = deployResponse.deployment_url;
          console.log("Base URL:", baseUrl);

          // Set the base URL immediately
          setFinalDeploymentUrl(baseUrl);
          setDeploymentUrls({
            deployment_url: baseUrl,
            database_uri: deployResponse.database_uri,
          });

          // Show modal first
          setShowUrlsModal(true);

          // Then check for /api/docs
          try {
            const finalUrl = await checkApiDocs(baseUrl);
            console.log("Final URL:", finalUrl);
            setFinalDeploymentUrl(finalUrl);
          } catch (error) {
            console.error("Error checking /api/docs:", error);
          }
        }
      }
    } catch (error) {
      console.error("Deployment failed:", error);
      alert("Deployment failed. Please try again.");
    } finally {
      setIsDeploying(false);
    }
  };

  const convertToStackblitzFiles = (
    structure: FileStructure[],
  ): Record<string, string> => {
    const files: Record<string, string> = {};
    structure.forEach((item) => {
      if (item.type === "file") {
        const cleanPath = item.path.replace(/^\.?\//, "");
        let content = item.content || "";

        if (cleanPath.endsWith(".json")) {
          try {
            const jsonContent = JSON.parse(content);
            content = JSON.stringify(jsonContent, null, 2);
          } catch (e) {
            console.error(`Error formatting JSON file ${cleanPath}:`, e);
          }
        }

        files[cleanPath] = content;
      }
    });
    return files;
  };

  const formatCode = async (
    files: Record<string, string>,
  ): Promise<Record<string, string>> => {
    const formattedFiles: Record<string, string> = {};

    for (const [filename, content] of Object.entries(files)) {
      if (
        filename.endsWith(".mjs") ||
        filename.endsWith(".js") ||
        filename.endsWith(".ts") ||
        filename.endsWith(".tsx")
      ) {
        try {
          const parser =
            filename.endsWith(".ts") || filename.endsWith(".tsx")
              ? "typescript"
              : "babel";
          const formattedContent = await format(content, {
            parser,
            semi: true,
            singleQuote: true,
            tabWidth: 2,
            trailingComma: "es5",
            printWidth: 100,
            bracketSpacing: true,
            arrowParens: "always",
            endOfLine: "lf",
            quoteProps: "as-needed",
            jsxSingleQuote: false,
            bracketSameLine: false,
            embeddedLanguageFormatting: "auto",
            singleAttributePerLine: false,
            filepath: filename,
          });
          formattedFiles[filename] = formattedContent;
        } catch (error) {
          console.warn(`Error formatting ${filename}:`, error);
          formattedFiles[filename] = content;
        }
      } else {
        formattedFiles[filename] = content;
      }
    }

    return formattedFiles;
  };

  const embedStackblitzProject = async (files: FileStructure[]) => {
    if (!editorRef.current) return;

    try {
      const stackblitzFiles = convertToStackblitzFiles(files);
      const formattedFiles = await formatCode(stackblitzFiles);

      sdk
        .embedProject(
          editorRef.current,
          {
            files: formattedFiles,
            title: "Express Project",
            description: "Express Project Viewer",
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
            theme: theme === "light" ? "light" : "dark",
            hideNavigation: true,
            forceEmbedLayout: true,
            hideDevTools: true,
            terminalHeight: 0,
          },
        )
        .then((vm) => {
          setVm(vm);
        });
    } catch (error) {
      console.error("Failed to embed Stackblitz project:", error);
    }
  };

  useEffect(() => {
    if (vm) {
      vm.editor.setTheme(theme === "light" ? "light" : "dark");
    }
  }, [theme, vm]);

  useEffect(() => {
    if (project) {
      embedStackblitzProject(project.structure);
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
            <div className="flex items-center justify-end mb-4 gap-2">
              <button
                onClick={handleDeploy}
                disabled={isDeploying}
                className={`px-4 py-2 transition-colors rounded-md flex items-center gap-2 text-sm
                  ${
                    theme === "light"
                      ? "border-black border-[1px] bg-white text-black hover:bg-gray-100"
                      : "border-button-color border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
                  }`}
              >
                {isDeploying ? (
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
                    <span>Deploy...</span>
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
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                    <span>Deploy</span>
                  </>
                )}
              </button>
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
              <button
                onClick={() => setShowUrlsModal(true)}
                disabled={!deploymentUrls}
                className={`px-4 py-2 transition-colors rounded-md flex items-center gap-2 text-sm
                  ${
                    theme === "light"
                      ? "border-black border-[1px] bg-white text-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      : "border-button-color border-[1px] bg-button-color text-text-color hover:bg-button-hover-color disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
              >
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
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                <span>View URLs</span>
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

        {/* URLs Modal */}
        {showUrlsModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
              className={`w-full max-w-lg rounded-xl shadow-2xl ${
                theme === "light"
                  ? "bg-white border border-gray-200"
                  : "bg-[#2f3136] border border-[#1e1f22]"
              }`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3
                    className={`text-base font-medium ${
                      theme === "light" ? "text-gray-900" : "text-white"
                    }`}
                  >
                    View URLs
                  </h3>
                  <button
                    onClick={() => setShowUrlsModal(false)}
                    className={`p-2 rounded-lg hover:bg-opacity-10 ${
                      theme === "light" ? "hover:bg-gray-900" : "hover:bg-white"
                    }`}
                  >
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      className={`block text-[10px] font-medium mb-1 ${
                        theme === "light" ? "text-gray-700" : "text-gray-300"
                      }`}
                    >
                      Deployment URL
                    </label>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex-1 px-3 py-2 rounded-lg border min-w-0 ${
                          theme === "light"
                            ? "bg-gray-50 text-gray-900 border-gray-200"
                            : "bg-[#383a40] text-gray-200 border-[#1e1f22]"
                        }`}
                      >
                        <a
                          href={
                            finalDeploymentUrl || deploymentUrls?.deployment_url
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-xs block truncate"
                        >
                          {finalDeploymentUrl || deploymentUrls?.deployment_url}
                        </a>
                      </div>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(
                            finalDeploymentUrl ||
                              deploymentUrls?.deployment_url ||
                              "",
                          )
                        }
                        className={`p-2 rounded-lg hover:bg-opacity-10 ${
                          theme === "light"
                            ? "hover:bg-gray-900"
                            : "hover:bg-white"
                        }`}
                      >
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
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      className={`block text-[10px] font-medium mb-1 ${
                        theme === "light" ? "text-gray-700" : "text-gray-300"
                      }`}
                    >
                      Database URI
                    </label>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex-1 px-3 py-2 rounded-lg border min-w-0 ${
                          theme === "light"
                            ? "bg-gray-50 text-gray-900 border-gray-200"
                            : "bg-[#383a40] text-gray-200 border-[#1e1f22]"
                        }`}
                      >
                        <a
                          href={deploymentUrls?.database_uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`hover:underline text-xs block truncate`}
                        >
                          {deploymentUrls?.database_uri}
                        </a>
                      </div>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(
                            deploymentUrls?.database_uri || "",
                          )
                        }
                        className={`p-2 rounded-lg hover:bg-opacity-10 ${
                          theme === "light"
                            ? "hover:bg-gray-900"
                            : "hover:bg-white"
                        }`}
                      >
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
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-between gap-3">
                  <button
                    onClick={() => {
                      const schemaUrl = `${deploymentUrls?.deployment_url}/api/openapi.json`;
                      navigator.clipboard.writeText(schemaUrl).then(() => {
                        toast.info(
                          "Schema URL copied to clipboard! Press Ctrl+V in Postman to import.",
                          {
                            position: "top-right",
                            autoClose: 3000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true,
                          },
                        );

                        setTimeout(() => {
                          window.open(
                            "https://web.postman.co/workspace/default/import",
                            "_blank",
                          );
                        }, 3000);
                      });
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      theme === "light"
                        ? "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
                        : "bg-[#383a40] text-gray-200 border border-[#1e1f22] hover:bg-[#404249]"
                    }`}
                  >
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span>Postman</span>
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowUrlsModal(false)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        theme === "light"
                          ? "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
                          : "bg-[#383a40] text-gray-200 border border-[#1e1f22] hover:bg-[#404249]"
                      }`}
                    >
                      Close
                    </button>
                    <button
                      onClick={() =>
                        window.open(deploymentUrls?.deployment_url, "_blank")
                      }
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        theme === "light"
                          ? "bg-gray-900 text-white hover:bg-gray-800"
                          : "bg-white text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      Open App
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
        className={`w-1/2 h-[calc(100vh-64px)] 
        ${
          theme === "light"
            ? "border-l border-gray-200"
            : "border-l border-[#1e1f22]"
        } overflow-hidden bg-[#1e1e1e] relative`}
      >
        {isGeneratingProject && (
          <div
            className={`absolute inset-0 flex items-center justify-center ${
              theme === "light" ? "bg-white" : "bg-[#1e1e1e]"
            } bg-opacity-90 z-50`}
          >
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
              <span
                className={`text-lg ${
                  theme === "light" ? "text-black" : "text-white"
                }`}
              >
                Generating project files...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
