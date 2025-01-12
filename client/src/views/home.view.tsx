import { useState, useEffect } from "react";
import { useTheme } from "../contexts/theme_provider";
import { placeholders_home } from "../configs/placeholder_home";
import { templates_home } from "../configs/templates_home";
import { useAuth } from "../contexts/auth_context";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { optionsProjectStack } from "../configs/options_project_stack";

export const Home = () => {
  const { theme } = useTheme();
  const [prompt, setPrompt] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(40);
  const [isPublic, setIsPublic] = useState(true);
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [showStackSelection, setShowStackSelection] = useState(false);
  const [selectedStack, setSelectedStack] = useState({
    apiType: "",
    language: "",
    framework: "",
    database: "",
    frontend: "",
    css: "",
  });
  const [projectType, setProjectType] = useState("fullstack");

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
    }
  }, [prompt]);

  const handleCreate = () => {
    if (!isLoggedIn) {
      toast.error("Please login to create a project");
      setTimeout(() => {
        navigate("/auth/login");
      }, 1000);
      return;
    }
    setShowStackSelection(true);
    toast.info("Please select your project stack", { autoClose: 2000 });
  };

  const renderStackSelection = () => (
    <div className="w-full max-w-4xl space-y-6">
      <div className="space-y-4">
        <h3 className="text-xl font-medium">Project Type</h3>
        <div className="grid grid-cols-3 gap-4">
          {["fullstack", "backend", "frontend"].map((type) => (
            <button
              key={type}
              onClick={() => {
                setProjectType(type);
                setSelectedStack({
                  apiType: "",
                  language: "",
                  framework: "",
                  database: "",
                  frontend: "",
                  css: "",
                });
              }}
              className={`p-3 border rounded-lg capitalize ${
                projectType === type
                  ? theme === "light"
                    ? "border-neutral-400 bg-neutral-100"
                    : "border-neutral-600 bg-neutral-800"
                  : theme === "light"
                  ? "border-gray-200 hover:bg-gray-50"
                  : "border-gray-700 hover:bg-gray-800"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`grid gap-8 ${
          projectType === "fullstack" ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        {(projectType === "fullstack" || projectType === "backend") && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Backend Configuration</h3>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium">
                  API Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {optionsProjectStack.apiTypes.map((api) => (
                    <button
                      key={api.value}
                      onClick={() =>
                        setSelectedStack({
                          ...selectedStack,
                          apiType:
                            selectedStack.apiType === api.value
                              ? ""
                              : api.value,
                          language:
                            selectedStack.apiType === api.value
                              ? ""
                              : selectedStack.language,
                          framework:
                            selectedStack.apiType === api.value
                              ? ""
                              : selectedStack.framework,
                          database:
                            selectedStack.apiType === api.value
                              ? ""
                              : selectedStack.database,
                          frontend:
                            selectedStack.apiType === api.value
                              ? ""
                              : selectedStack.frontend,
                          css:
                            selectedStack.apiType === api.value
                              ? ""
                              : selectedStack.css,
                        })
                      }
                      className={`flex items-center justify-center p-3 border rounded-lg ${
                        selectedStack.apiType === api.value
                          ? theme === "light"
                            ? "border-neutral-400 bg-neutral-100"
                            : "border-neutral-600 bg-neutral-800"
                          : theme === "light"
                          ? "border-gray-200 hover:bg-gray-50"
                          : "border-gray-700 hover:bg-gray-800"
                      }`}
                    >
                      <img
                        src={api.icon}
                        alt={api.label}
                        className={`w-8 h-8 mr-2 ${
                          theme === "dark" && api.value === "rest" ? "invert" : ""
                        }`}
                      />
                      <span>{api.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedStack.apiType && (
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Language
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {optionsProjectStack.languages.map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() =>
                          setSelectedStack({
                            ...selectedStack,
                            language:
                              selectedStack.language === lang.value
                                ? ""
                                : lang.value,
                            framework:
                              selectedStack.language === lang.value
                                ? ""
                                : selectedStack.framework,
                            database:
                              selectedStack.language === lang.value
                                ? ""
                                : selectedStack.database,
                            frontend:
                              selectedStack.language === lang.value
                                ? ""
                                : selectedStack.frontend,
                            css:
                              selectedStack.language === lang.value
                                ? ""
                                : selectedStack.css,
                          })
                        }
                        className={`flex items-center justify-center p-3 border rounded-lg ${
                          selectedStack.language === lang.value
                            ? theme === "light"
                              ? "border-neutral-400 bg-neutral-100"
                              : "border-neutral-600 bg-neutral-800"
                            : theme === "light"
                            ? "border-gray-200 hover:bg-gray-50"
                            : "border-gray-700 hover:bg-gray-800"
                        }`}
                      >
                        <img
                          src={lang.icon}
                          alt={lang.label}
                          className="w-8 h-8 mr-2"
                        />
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedStack.language && (
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Framework
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {optionsProjectStack.frameworks[
                      selectedStack.language as keyof typeof optionsProjectStack.frameworks
                    ].map((framework) => (
                      <button
                        key={framework.value}
                        onClick={() =>
                          setSelectedStack({
                            ...selectedStack,
                            framework:
                              selectedStack.framework === framework.value
                                ? ""
                                : framework.value,
                            database:
                              selectedStack.framework === framework.value
                                ? ""
                                : selectedStack.database,
                            frontend:
                              selectedStack.framework === framework.value
                                ? ""
                                : selectedStack.frontend,
                            css:
                              selectedStack.framework === framework.value
                                ? ""
                                : selectedStack.css,
                          })
                        }
                        className={`flex items-center justify-center p-3 border rounded-lg ${
                          selectedStack.framework === framework.value
                            ? theme === "light"
                              ? "border-neutral-400 bg-neutral-100"
                              : "border-neutral-600 bg-neutral-800"
                            : theme === "light"
                            ? "border-gray-200 hover:bg-gray-50"
                            : "border-gray-700 hover:bg-gray-800"
                        }`}
                      >
                        <img
                          src={framework.icon}
                          alt={framework.label}
                          className={`w-8 h-8 mr-2 ${
                            theme === "dark" && framework.value === "express" ? "invert" : ""
                          }`}
                        />
                        <span>{framework.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedStack.framework && (
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Database
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {optionsProjectStack.databases.map((db) => (
                      <button
                        key={db.value}
                        onClick={() =>
                          setSelectedStack({
                            ...selectedStack,
                            database:
                              selectedStack.database === db.value
                                ? ""
                                : db.value,
                            frontend:
                              selectedStack.database === db.value
                                ? ""
                                : selectedStack.frontend,
                            css:
                              selectedStack.database === db.value
                                ? ""
                                : selectedStack.css,
                          })
                        }
                        className={`flex items-center justify-center p-3 border rounded-lg ${
                          selectedStack.database === db.value
                            ? theme === "light"
                              ? "border-neutral-400 bg-neutral-100"
                              : "border-neutral-600 bg-neutral-800"
                            : theme === "light"
                            ? "border-gray-200 hover:bg-gray-50"
                            : "border-gray-700 hover:bg-gray-800"
                        }`}
                      >
                        <img
                          src={db.icon}
                          alt={db.label}
                          className="w-8 h-8 mr-2"
                        />
                        <span>{db.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {(projectType === "fullstack" || projectType === "frontend") && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Frontend Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Framework
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {optionsProjectStack.frontend.map((framework) => (
                    <button
                      key={framework.value}
                      onClick={() =>
                        setSelectedStack({
                          ...selectedStack,
                          frontend:
                            selectedStack.frontend === framework.value
                              ? ""
                              : framework.value,
                          css:
                            selectedStack.frontend === framework.value
                              ? ""
                              : selectedStack.css,
                        })
                      }
                      className={`flex items-center justify-center p-3 border rounded-lg ${
                        selectedStack.frontend === framework.value
                          ? theme === "light"
                            ? "border-neutral-400 bg-neutral-100"
                            : "border-neutral-600 bg-neutral-800"
                          : theme === "light"
                          ? "border-gray-200 hover:bg-gray-50"
                          : "border-gray-700 hover:bg-gray-800"
                      }`}
                    >
                      <img
                        src={framework.icon}
                        alt={framework.label}
                        className={`w-8 h-8 mr-2 ${
                          theme === "dark" && framework.value === "nextjs"
                            ? "invert"
                            : ""
                        }`}
                      />
                      <span>{framework.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedStack.frontend &&
                optionsProjectStack.frontend.find(
                  (f) => f.value === selectedStack.frontend,
                )?.supportsCss && (
                  <div>
                    <label className="block mb-2 text-sm font-medium">
                      CSS Framework
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {optionsProjectStack.css.map((css) => (
                        <button
                          key={css.value}
                          onClick={() =>
                            setSelectedStack({
                              ...selectedStack,
                              css:
                                selectedStack.css === css.value
                                  ? ""
                                  : css.value,
                            })
                          }
                          className={`flex items-center justify-center p-3 border rounded-lg ${
                            selectedStack.css === css.value
                              ? theme === "light"
                                ? "border-neutral-400 bg-neutral-100"
                                : "border-neutral-600 bg-neutral-800"
                              : theme === "light"
                              ? "border-gray-200 hover:bg-gray-50"
                              : "border-gray-700 hover:bg-gray-800"
                          }`}
                        >
                          <img
                            src={css.icon}
                            alt={css.label}
                            className="w-8 h-8 mr-2"
                          />
                          <span>{css.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          className={`px-6 py-2 transition-colors rounded-md ${
            theme === "light"
              ? "border-black border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
              : "border-white border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
          }`}
          onClick={() => {
            setSelectedStack({
              apiType: "",
              language: "",
              framework: "",
              database: "",
              frontend: "",
              css: "",
            });
            setProjectType("fullstack");
          }}
        >
          Reset
        </button>
        <button
          className={`px-6 py-2 transition-colors rounded-md ${
            theme === "light"
              ? "border-black border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
              : "border-white border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
          }`}
          onClick={() => {
            const isValid =
              projectType === "fullstack"
                ? Object.values(selectedStack).every((value) => value !== "")
                : projectType === "backend"
                ? ["apiType", "language", "framework", "database"].every(
                    (key) =>
                      selectedStack[key as keyof typeof selectedStack] !== "",
                  )
                : ["frontend", "css"].every(
                    (key) =>
                      selectedStack[key as keyof typeof selectedStack] !== "",
                  );

            if (!isValid) {
              toast.error("Please fill in all required fields");
              return;
            }
            console.log(selectedStack);
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen p-6 space-y-12
      ${
        theme === "dark"
          ? "bg-neutral-900 text-neutral-100"
          : "bg-neutral-50 text-neutral-900"
      }`}
    >
      {!showStackSelection ? (
        <>
          <h1 className="max-w-2xl text-3xl font-bold text-center md:text-4xl">
            Idea to app in seconds
          </h1>

          <div className="w-full max-w-4xl">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholder}
                className={`w-full px-4 py-3 pb-16 rounded-lg resize-none overflow-hidden ${
                  theme === "light"
                    ? "bg-white text-black border border-neutral-200"
                    : "bg-neutral-800 text-white border border-neutral-700"
                } focus:outline-none focus:ring-2 focus:ring-neutral-500 min-h-[120px]`}
              />

              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`absolute bottom-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md z-10 ${
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
                className={`absolute bottom-4 right-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg z-10 ${
                  theme === "light"
                    ? "bg-black text-white hover:bg-neutral-800"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
                onClick={handleCreate}
              >
                Create
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
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
        </>
      ) : (
        renderStackSelection()
      )}
    </div>
  );
};
