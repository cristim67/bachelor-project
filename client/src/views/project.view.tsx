import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/auth_context";
import { useNavigate } from "react-router-dom";

export const Project = () => {
    const { isLoggedIn } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();

    if (!isLoggedIn) {
        navigate("/auth/login");
    }
    
    return (
      <div className="flex flex-col items-center justify-center h-screen">  
        <h1>Project</h1>
        <p>Project ID: {id}</p>
      </div>
    );
}