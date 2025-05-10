import axios from "axios";
import { toast } from "react-toastify";
import { API_URL, BUILD_MACHINE_URL } from "../configs/env_handler";
import { ProjectType } from "../dtos/project_types";

const buildMachineInstance = axios.create({
  baseURL: BUILD_MACHINE_URL,
});

const instance = axios.create({
  baseURL: API_URL,
});

instance.interceptors.request.use((config) => {
  const session = localStorage.getItem("apiToken");
  if (session) {
    config.headers.Authorization = `Bearer ${session}`;
  }
  return config;
});

buildMachineInstance.interceptors.request.use((config) => {
  const session = localStorage.getItem("apiToken");
  if (session) {
    config.headers.Authorization = `Bearer ${session}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status !== 401 && error.response?.data?.detail) {
      toast.error(error.response.data.detail);
    }
    return Promise.reject(error);
  },
);

buildMachineInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status !== 401 && error.response?.data?.detail) {
      toast.error(error.response.data.detail);
    }
    return Promise.reject(error);
  },
);

export async function isAuthenticated() {
  const token = localStorage.getItem("apiToken");

  if (!token) {
    localStorage.removeItem("user");
    return { isValid: false };
  }

  try {
    const response = await instance.get("/v1/auth/session/check");
    if (response.status === 200) {
      return { isValid: true };
    } else {
      localStorage.removeItem("apiToken");
      localStorage.removeItem("user");
      return { isValid: false };
    }
  } catch (error) {
    console.log(error);
    localStorage.removeItem("apiToken");
    localStorage.removeItem("user");
    return { isValid: false };
  }
}

export async function login(email: string, password: string) {
  const response = await instance.post("/v1/auth/login", {
    email,
    password,
  });

  if (response.data.session_token) {
    localStorage.setItem("apiToken", response.data.session_token);
    localStorage.setItem("user", JSON.stringify(response.data.user));
  }

  return response.data;
}

export async function googleLogin(credential: string) {
  const response = await instance.post("/v1/auth/google-login", {
    credential,
  });

  if (response.data.session_token) {
    localStorage.setItem("apiToken", response.data.session_token);
    localStorage.setItem("user", JSON.stringify(response.data.user));
  }

  return response.data;
}

export async function logout() {
  const response = await instance.post("/v1/auth/logout");
  localStorage.removeItem("apiToken");
  localStorage.removeItem("user");
  window.location.reload();
  return response.data;
}

export async function register(
  username: string,
  email: string,
  password: string,
) {
  const response = await instance.post("/v1/auth/register", {
    username,
    email,
    password,
  });
  return response.data;
}

export async function forgotPassword(email: string) {
  const response = await instance.post("/v1/auth/user/forgot-password", {
    email,
  });
  return response.data;
}

export async function createProject(project: ProjectType) {
  const response = await instance.post("/v1/project/create", project);
  return response.data;
}

export async function getProject(id: string) {
  const response = await instance.get(`/v1/project/get/${id}`);
  return response.data;
}

export async function checkProjectS3(id: string) {
  const response = await instance.get(`/v1/project/check-s3/${id}`);
  return response.data;
}

export async function generateProject(message: string, id: string) {
  const token = localStorage.getItem("apiToken");
  const response = await fetch(`${API_URL}/v1/chat/project-generator`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: message,
      history: [],
      agent: "project_generator",
      // model: "gpt-4o-mini",
      model: "gemini-2.0-flash",
      // model: "gemini-2.5-flash-preview-04-17",
      options: {
        streaming: false,
      },
      project: {
        projectId: id,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const userStr = localStorage.getItem("user");
  if (userStr) {
    const user = JSON.parse(userStr);
    user.token_usage = (user.token_usage || 0) + 150;
    localStorage.setItem("user", JSON.stringify(user));
  }

  return response.json();
}

export async function generateBackendRequirements(
  message: string,
  id: string,
  onChunk: (chunk: string) => void,
) {
  console.log("Starting backend requirements generation...");
  const token = localStorage.getItem("apiToken");
  const response = await fetch(`${API_URL}/v1/chat/backend-requirements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: message,
      history: [],
      agent: "backend_requirements",
      // model: "gpt-4o-mini",
      model: "gemini-2.0-flash",
      // model: "gemini-2.5-flash-preview-04-17",
      options: {
        streaming: true,
      },
      project: {
        projectId: id,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const userStr = localStorage.getItem("user");
  if (userStr) {
    const user = JSON.parse(userStr);
    user.token_usage = (user.token_usage || 0) + 100;
    localStorage.setItem("user", JSON.stringify(user));
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No reader available");
  }

  const decoder = new TextDecoder();
  const buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();

      if (done) {
        if (buffer.trim()) {
          onChunk(buffer);
        }
        console.log("Streaming completed");
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  } catch (error) {
    console.error("Error during streaming:", error);
    throw error;
  } finally {
    reader.releaseLock();
  }

  return "done";
}

export async function getProjects() {
  const response = await instance.get("/v1/project/get-all");
  return response.data;
}

export async function deleteProject(id: string) {
  const response = await instance.delete(`/v1/project/delete/${id}`);
  return response.data;
}

export async function deployProject(
  presignedUrl: string,
  projectName: string,
  region: string,
  projectId: string,
  databaseName: string,
) {
  const response = await buildMachineInstance.post("/project-build", {
    presigned_url: presignedUrl,
    project_name: projectName,
    region: region,
    project_id: projectId,
    database_name: databaseName,
  });
  return response.data;
}

export async function getUser() {
  const response = await instance.get("/v1/auth/user");
  return response.data;
}

export async function enhancePrompt(prompt: string) {
  const response = await instance.post("/v1/chat/enhance-prompt", {
    message: prompt,
    history: [],
    agent: "enchant_user_prompt",
    // model: "gpt-4o-mini",
    model: "gemini-2.0-flash",
    // model: "gemini-2.5-flash-preview-04-17",
    options: {
      streaming: false,
    },
  });

  const userStr = localStorage.getItem("user");
  if (userStr) {
    const user = JSON.parse(userStr);
    user.token_usage = (user.token_usage || 0) + 50;
    localStorage.setItem("user", JSON.stringify(user));
  }

  return response.data;
}
