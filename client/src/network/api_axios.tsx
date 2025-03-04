import axios from "axios";
import { toast } from "react-toastify";
import { API_URL } from "../configs/env_handler";
import { ProjectType } from "../dtos/project_types";
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

instance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.data.detail) {
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

export async function generateProject(message: string, id: string) {
  const response = await instance.post("/v1/chat/project-generator", {
    message: message,
    history: [],
    agent: "project_generator",
    model: "gpt-4o",
    options: {
      streaming: true,
    },
    project: {
      projectId: id,
    },
  });
  return response.data;
}
