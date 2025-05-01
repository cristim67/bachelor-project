import { useState, useEffect } from "react";
import { useTheme } from "../contexts/theme_provider";
import { placeholders_home } from "../configs/placeholder_home";
import { templates_home } from "../configs/templates_home";
import { useAuth } from "../contexts/auth_context";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { createProject, enhancePrompt } from "../network/api_axios";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

export const Home = () => {
  const { theme } = useTheme();
  const [prompt, setPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(40);
  const [isPublic, setIsPublic] = useState(true);
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [editedEnhancedPrompt, setEditedEnhancedPrompt] = useState("");

  const { listening, resetTranscript, browserSupportsSpeechRecognition } =
    useSpeechRecognition();

  useEffect(() => {
    const handleTyping = () => {
      const i = loopNum % placeholders_home.length;
      const fullText = placeholders_home[i];

      setPlaceholder(
        isDeleting
          ? fullText.substring(0, placeholder.length - 1)
          : fullText.substring(0, placeholder.length + 1),
      );

      setTypingSpeed(isDeleting ? 30 : 40);

      if (!isDeleting && placeholder === fullText) {
        setTimeout(() => setIsDeleting(true), 1500);
      } else if (isDeleting && placeholder === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [placeholder, isDeleting, loopNum, typingSpeed]);

  useEffect(() => {
    const textarea = document.querySelector("textarea");
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
      // Scroll to bottom when content changes
      textarea.scrollTop = textarea.scrollHeight;
    }
  }, [prompt]);

  const handleAttach = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,.md,.pdf,.doc,.docx";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file?.size && file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }

      const supportedExtensions = [".txt", ".md", ".pdf", ".doc", ".docx"];
      if (!supportedExtensions.includes(file?.type || "")) {
        toast.error("Unsupported file type");
        return;
      }

      if (file) {
        setAttachedFile(file);
      }
    };

    input.click();
  };

  const handleCreate = async () => {
    if (!isLoggedIn) {
      toast.error("Please login to create a project");
      setTimeout(() => {
        navigate("/auth/login");
      }, 1000);
      return;
    }

    localStorage.setItem(
      "project",
      JSON.stringify({
        prompt: prompt,
        is_public: isPublic,
        file: attachedFile?.name,
      }),
    );

    const projectData = {
      idea: prompt,
      is_public: isPublic,
      file: attachedFile,
    };

    const response = await createProject(projectData);
    const projectId = response.project._id;
    toast.success("Project created successfully");
    setTimeout(() => {
      navigate(`/projects/${projectId}`);
    }, 1000);
  };

  const handleEnhance = async () => {
    if (!isLoggedIn) {
      toast.error("Please login to enhance your prompt");
      setTimeout(() => {
        navigate("/auth/login");
      }, 1000);
      return;
    }

    if (!prompt.trim()) {
      toast.error("Please enter a prompt first");
      return;
    }

    setIsEnhancing(true);
    try {
      const response = await enhancePrompt(prompt);
      setEnhancedPrompt(response.enhanced_prompt);
      setEditedEnhancedPrompt(response.enhanced_prompt);
      toast.success("Prompt enhanced successfully!");
    } catch (error) {
      console.log(error);
      toast.error("Failed to enhance prompt");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleApproveEnhanced = () => {
    setPrompt(editedEnhancedPrompt);
    setEnhancedPrompt("");
    setEditedEnhancedPrompt("");
    toast.success("Enhanced prompt applied!");

    // Force scroll to bottom after state updates
    setTimeout(() => {
      const textarea = document.querySelector("textarea");
      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    }, 0);
  };

  const handleVoiceToggle = () => {
    console.log("Voice toggle clicked, current state:", listening);

    if (!browserSupportsSpeechRecognition) {
      console.error("Browser does not support speech recognition");
      toast.error("Your browser does not support speech recognition");
      return;
    }

    if (listening) {
      console.log("Stopping speech recognition");
      SpeechRecognition.stopListening();
      resetTranscript();
      return;
    }

    // Check microphone permissions only when trying to start voice recognition
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        console.log("Microphone access granted");
        SpeechRecognition.startListening({
          continuous: true,
          language: "en-US",
          interimResults: true,
        }).catch((error: Error) => {
          console.error("Error starting speech recognition:", error);
          toast.error("Failed to start speech recognition");
        });
      })
      .catch((error) => {
        console.error("Microphone access denied:", error);
        toast.error("Please allow microphone access to use voice recognition");
      });
  };

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen p-6 space-y-12
      ${
        theme === "dark"
          ? "bg-neutral-900 text-neutral-100"
          : "bg-neutral-50 text-neutral-900"
      }`}
    >
      <h1 className="max-w-4xl text-3xl font-bold text-center md:text-5xl">
        Idea to app in seconds
      </h1>

      <div className="w-full max-w-4xl">
        <div className="relative">
          <div
            className={`relative rounded-lg ${
              theme === "light"
                ? "focus-within:ring-2 focus-within:ring-neutral-500"
                : "focus-within:ring-2 focus-within:ring-neutral-500"
            }`}
          >
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder}
              className={`w-full px-4 py-3 pb-20 rounded-lg resize-none overflow-y-auto ${
                theme === "light"
                  ? "bg-white text-black border border-neutral-200"
                  : "bg-neutral-800 text-white border border-neutral-700"
              } focus:outline-none min-h-[150px] max-h-[300px]`}
            />
            <div
              className={`absolute bottom-0 left-0 right-0 rounded-b-lg ${
                theme === "light"
                  ? "bg-white border-l border-r border-b border-neutral-200"
                  : "bg-neutral-800 border-l border-r border-b border-neutral-700"
              }`}
              style={{ height: "60px" }}
            ></div>
          </div>

          {listening && (
            <div
              className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs ${
                theme === "light"
                  ? "bg-white text-black border border-neutral-200"
                  : "bg-black text-white border border-neutral-700  "
              }`}
            >
              Listening...
            </div>
          )}

          <div className="absolute bottom-4 left-4 flex gap-2">
            <button
              onClick={() => setIsPublic(!isPublic)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md z-10 ${
                theme === "light"
                  ? "border-black border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
                  : "border-white border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
              }`}
            >
              {isPublic ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <ellipse cx="12" cy="12" rx="4" ry="10"></ellipse>
                  <path d="M2 12h20"></path>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    ry="2"
                  ></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              )}
              {isPublic ? "Public" : "Private"}
            </button>

            <button
              onClick={handleVoiceToggle}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md z-10 ${
                theme === "light"
                  ? "border-black border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
                  : "border-white border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
              }`}
            >
              {listening ? (
                <div className="relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="22"></line>
                  </svg>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                </div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="22"></line>
                </svg>
              )}
              Voice
            </button>

            <button
              onClick={handleAttach}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md z-10 ${
                theme === "light"
                  ? "border-black border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
                  : "border-white border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              {attachedFile ? attachedFile.name : "Attach"}
            </button>
          </div>

          <div className="absolute bottom-4 right-4 flex gap-2">
            <div
              className={`absolute inset-0 ${
                theme === "light" ? "bg-white" : "bg-neutral-800"
              }`}
              style={{ height: "40px" }}
            ></div>
            {enhancedPrompt && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div
                  className={`w-full max-w-4xl flex flex-col rounded-lg ${
                    theme === "dark" ? "bg-neutral-800" : "bg-white"
                  }`}
                  style={{ height: "calc(100vh - 2rem)" }}
                >
                  <div
                    className={`flex-shrink-0 p-6 pb-4 border-b ${
                      theme === "dark"
                        ? "border-neutral-700"
                        : "border-neutral-200"
                    }`}
                  >
                    <h2 className="text-xl font-bold text-center">
                      Compare Changes
                    </h2>
                  </div>

                  <div className="flex-1 min-h-0 overflow-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 h-full">
                      <div className="flex flex-col h-full">
                        <h3
                          className={`text-lg font-semibold mb-2 sticky top-0 ${
                            theme === "dark"
                              ? "text-neutral-200"
                              : "text-neutral-800"
                          }`}
                        >
                          Original Prompt
                        </h3>
                        <div
                          className={`flex-1 relative p-4 rounded-lg font-mono text-sm leading-relaxed overflow-auto ${
                            theme === "dark"
                              ? "bg-neutral-700/50"
                              : "bg-neutral-100"
                          }`}
                        >
                          {prompt.split("\n").map((line, i) => (
                            <div
                              key={i}
                              className={`flex items-start group py-1 -mx-2 px-2 rounded transition-colors ${
                                theme === "dark"
                                  ? "hover:bg-red-500/10"
                                  : "hover:bg-red-50"
                              }`}
                            >
                              <span className="text-red-500 w-6 flex-shrink-0 select-none font-medium">
                                -
                              </span>
                              <pre className="whitespace-pre-wrap break-words flex-1 font-mono">
                                {line || "\u00A0"}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col h-full">
                        <h3
                          className={`text-lg font-semibold mb-2 sticky top-0 ${
                            theme === "dark"
                              ? "text-neutral-200"
                              : "text-neutral-800"
                          }`}
                        >
                          Enhanced Prompt
                        </h3>
                        <div
                          className={`flex-1 relative p-4 rounded-lg font-mono text-sm leading-relaxed ${
                            theme === "dark"
                              ? "bg-neutral-700/50"
                              : "bg-neutral-100"
                          }`}
                        >
                          <textarea
                            value={editedEnhancedPrompt}
                            onChange={(e) =>
                              setEditedEnhancedPrompt(e.target.value)
                            }
                            className={`w-full h-full bg-transparent border-0 focus:ring-0 p-0 font-mono text-sm resize-none ${
                              theme === "dark" ? "text-white" : "text-black"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex-shrink-0 p-6 pt-4 border-t flex justify-end gap-2 ${
                      theme === "dark"
                        ? "border-neutral-700"
                        : "border-neutral-200"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setEnhancedPrompt("");
                        setEditedEnhancedPrompt("");
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                        theme === "light"
                          ? "border-black border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
                          : "border-white border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApproveEnhanced}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                        theme === "light"
                          ? "bg-black text-white hover:bg-neutral-800"
                          : "bg-white text-black hover:bg-neutral-100"
                      }`}
                    >
                      Apply Enhanced
                    </button>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={handleEnhance}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg z-10 ${
                theme === "light"
                  ? "border-black border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
                  : "border-white border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
              }`}
            >
              {isEnhancing ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 3v2m0 14v2M3 12h2m14 0h2m-4.95-4.95l1.414 1.414M5.636 18.364l1.414-1.414M18.364 5.636l-1.414 1.414M5.636 5.636l1.414 1.414" />
                </svg>
              )}
              {isEnhancing ? "Enhancing..." : "Enhance Prompt"}
            </button>
            <button
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg z-10 ${
                theme === "light"
                  ? "bg-black text-white hover:bg-neutral-800"
                  : "bg-white text-black hover:bg-neutral-100"
              }`}
              onClick={handleCreate}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl">
        <h2 className="mb-4 text-xl font-medium">Choose a template</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {templates_home.map((template, index) => (
            <button
              key={index}
              onClick={() => setPrompt(template.description)}
              className={`w-full px-3 py-1.5 text-sm transition-colors rounded-md ${
                theme === "light"
                  ? "border-black border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
                  : "border-white border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
              }`}
            >
              {template.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
