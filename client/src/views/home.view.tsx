import { useState, useEffect } from "react";
import { useTheme } from "../contexts/theme_provider";
import { placeholders_home } from "../configs/placeholder_home";
import { templates_home } from "../configs/templates_home";
import { useAuth } from "../contexts/auth_context";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

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
    }

    console.log(prompt);
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
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
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
              } focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2`}
            >
              {template.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
