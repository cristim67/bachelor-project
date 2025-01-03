import axios from "axios";
import { toast } from "react-toastify";
import { message_status } from "../configs/error_messages";
import { API_URL } from "../configs/env_handler";

const instance = axios.create({
    baseURL: API_URL,
});

instance.interceptors.request.use((config) => {
    const session = localStorage.getItem("apiToken");
    if(session){
        config.headers.Authorization = `Bearer ${session}`;
    }
    return config;
});

instance.interceptors.response.use((response) => {
    return response;
}, (error) => {
    if (error.response) {
        if(error.response.status === 401){
            localStorage.removeItem("apiToken");
            localStorage.removeItem("user");
            window.location.href = "/auth/login";
        }
        if (error.response.status === 403) {
            toast.error("You are not authorized to access this resource");
            setTimeout(() => {
                window.location.href = "/";
            }, 3000);
        }
        
        if (message_status[error.response.status as keyof typeof message_status]) {
            toast.error(message_status[error.response.status as keyof typeof message_status]);
        } 
    }
    return Promise.reject(error);
});

export async function isAuthenticated(){
    const token = localStorage.getItem("apiToken");
    
    if (!token) {
        localStorage.removeItem("user");
        toast.error("No session found, please login");
        setTimeout(() => {
            window.location.href = "/auth/login";
        }, 3000);
        return false;
    }

    try {
        const response = await instance.get(`/auth/session/check?token=${token}`);
        return response.data;
    } catch (error) {
        console.log(error);
        return false;
    }
}