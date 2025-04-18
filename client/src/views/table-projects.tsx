import { useEffect, useState } from "react";
import { getProjects, getProject } from "../network/api_axios";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/theme_provider";
import axios from "axios";
import { deleteProject } from "../network/api_axios";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/auth_context";

interface Project {
  _id: string;
  idea: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  stack: {
    apiType: string;
    language: string;
    framework: string;
    database: string;
    frontend: string;
  };
  s3_presigned_url: string | null;
}

export const TableProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      navigate("/auth/login");
    }
  }, [isLoggedIn, isLoading, navigate]);

  useEffect(() => {
    const fetchProjects = async () => {
      const response = await getProjects();
      const sortedProjects = response.projects.sort(
        (a: Project, b: Project) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setProjects(sortedProjects);
    };
    fetchProjects();
  }, []);

  const handleDownload = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setDownloadingId(projectId);
    try {
      const response = await getProject(projectId);
      if (response && response.project && response.project.s3_presigned_url) {
        const s3Response = await axios.get(response.project.s3_presigned_url, {
          responseType: "blob",
        });

        const url = window.URL.createObjectURL(s3Response.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = `project-${projectId}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setSelectedProjectId(projectId);
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProjectId) return;

    setDeletingId(selectedProjectId);
    try {
      await deleteProject(selectedProjectId);
      setProjects(projects.filter((p) => p._id !== selectedProjectId));
      toast.success("Project deleted successfully!");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete project");
    } finally {
      setDeletingId(null);
      setShowConfirmDelete(false);
      setSelectedProjectId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm");
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <>
      <div className="container mx-auto px-4 h-screen pt-20 pb-20">
        <div
          className={`h-full rounded-2xl shadow-lg overflow-hidden ${
            theme === "light"
              ? "bg-white border border-black"
              : "bg-gray-800 border border-button-color"
          }`}
        >
          <div className="flex justify-between items-center p-6 border-b border-inherit">
            <div className="flex items-center gap-4">
              <h1
                className={`text-2xl font-bold ${
                  theme === "light" ? "text-black" : "text-gray-100"
                }`}
              >
                Your Projects
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  theme === "light"
                    ? "bg-gray-100 text-black"
                    : "bg-gray-700 text-gray-100"
                }`}
              >
                {projects.length}{" "}
                {projects.length === 1 ? "project" : "projects"}
              </span>
            </div>
            <button
              className={`px-4 py-2 rounded-md transition-colors ${
                theme === "light"
                  ? "border-black border-[1px] bg-white text-black hover:bg-gray-100"
                  : "border-button-color border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
              }`}
              onClick={() => navigate("/")}
            >
              New Project
            </button>
          </div>
          <div className="overflow-auto max-h-[calc(100vh-11rem)]">
            {projects.length > 0 ? (
              <table className="min-w-full">
                <thead>
                  <tr
                    className={
                      theme === "light"
                        ? "bg-white border-b border-black"
                        : "bg-gray-800 border-b border-button-color"
                    }
                  >
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        theme === "light" ? "text-black" : "text-gray-300"
                      }`}
                    >
                      #
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        theme === "light" ? "text-black" : "text-gray-300"
                      }`}
                    >
                      Project Idea
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        theme === "light" ? "text-black" : "text-gray-300"
                      }`}
                    >
                      Created At
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        theme === "light" ? "text-black" : "text-gray-300"
                      }`}
                    >
                      Status
                    </th>
                    <th
                      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        theme === "light" ? "text-black" : "text-gray-300"
                      }`}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {projects.map((project, index) => (
                    <tr
                      key={project._id}
                      className={`cursor-pointer ${
                        theme === "light"
                          ? "hover:bg-gray-100 border-b border-black"
                          : "hover:bg-[#2f3136] border-b border-button-color"
                      }`}
                      onClick={() => navigate(`/projects/${project._id}`)}
                    >
                      <td
                        className={`px-6 py-4 ${
                          theme === "light" ? "text-black" : "text-gray-300"
                        }`}
                      >
                        <div className="text-sm font-medium">{index + 1}</div>
                      </td>
                      <td
                        className={`px-6 py-4 ${
                          theme === "light" ? "text-black" : "text-gray-300"
                        }`}
                      >
                        <div className="text-sm">
                          {truncateText(project.idea, 50)}
                        </div>
                      </td>
                      <td
                        className={`px-6 py-4 ${
                          theme === "light" ? "text-black" : "text-gray-300"
                        }`}
                      >
                        <div className="text-sm">
                          {formatDate(project.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            theme === "light"
                              ? project.s3_presigned_url
                                ? "bg-white text-black border border-black"
                                : "bg-white text-black border border-black"
                              : project.s3_presigned_url
                              ? "bg-button-color text-text-color border border-button-color"
                              : "bg-button-color text-text-color border border-button-color"
                          }`}
                        >
                          {project.s3_presigned_url ? "Generated" : "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {project.s3_presigned_url && (
                            <button
                              onClick={(e) => handleDownload(e, project._id)}
                              className={`p-1.5 rounded-md flex items-center transition-colors ${
                                theme === "light"
                                  ? "text-gray-600 hover:bg-gray-100"
                                  : "text-gray-400 hover:bg-[#2f3136]"
                              }`}
                            >
                              {downloadingId === project._id ? (
                                <svg
                                  className="w-5 h-5 animate-spin"
                                  viewBox="0 0 24 24"
                                >
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
                                  className="w-5 h-5"
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
                              )}
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDeleteClick(e, project._id)}
                            className={`p-1.5 rounded-md flex items-center transition-colors ${
                              theme === "light"
                                ? "text-gray-600 hover:bg-gray-100"
                                : "text-gray-400 hover:bg-[#2f3136]"
                            }`}
                          >
                            {deletingId === project._id ? (
                              <svg
                                className="w-5 h-5 animate-spin"
                                viewBox="0 0 24 24"
                              >
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
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-15rem)] gap-6">
                <div
                  className={`text-center ${
                    theme === "light" ? "text-black" : "text-gray-300"
                  }`}
                >
                  <svg
                    className="w-20 h-20 mx-auto mb-4 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  <p className="text-xl font-medium mb-2">No projects yet</p>
                  <p className="text-sm opacity-75">
                    Create your first project to get started
                  </p>
                </div>
                <button
                  onClick={() => navigate("/")}
                  className={`px-6 py-3 rounded-md transition-colors text-base ${
                    theme === "light"
                      ? "border-black border-[1px] bg-white text-black hover:bg-gray-100"
                      : "border-button-color border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
                  }`}
                >
                  Create New Project
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`p-6 rounded-2xl shadow-lg max-w-md w-full mx-4 ${
              theme === "light"
                ? "bg-white border border-black"
                : "bg-gray-800 border border-button-color"
            }`}
          >
            <h3
              className={`text-lg font-medium mb-4 ${
                theme === "light" ? "text-black" : "text-gray-100"
              }`}
            >
              Delete Project
            </h3>
            <p
              className={`mb-6 ${
                theme === "light" ? "text-black" : "text-gray-300"
              }`}
            >
              Are you sure you want to delete this project? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowConfirmDelete(false);
                  setSelectedProjectId(null);
                }}
                className={`px-4 py-2 rounded-md transition-colors ${
                  theme === "light"
                    ? "border-black border-[1px] bg-white text-black hover:bg-gray-100"
                    : "border-button-color border-[1px] bg-button-color text-text-color hover:bg-button-hover-color"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className={`px-4 py-2 rounded-md transition-colors ${
                  theme === "light"
                    ? "bg-red-500 text-white hover:bg-red-600 border border-red-500"
                    : "bg-red-500 text-white hover:bg-red-600 border border-red-500"
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
