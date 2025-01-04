import React, { useState } from "react";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { login, googleLogin } from "../network/api_axios";

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const [loginLoading, setLoginLoading] = useState(false);
    const [googleLoginLoading, setGoogleLoginLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoginLoading(true);
        try {
            const response = await login(email, password); 
            console.log(response);
            navigate("/");
        } catch (error) {
            alert(error);
        }
        setLoginLoading(false);
    };

    const handleGoogleLogin = async (credentialResponse: CredentialResponse) => {
        setGoogleLoginLoading(true);
        try {
            await googleLogin(credentialResponse.credential!);
            navigate("/");
        } catch (error) {
            alert(error);
        }
        setGoogleLoginLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
                <div className="mb-4 text-center">
                    {googleLoginLoading ? (
                        <div className="text-gray-500">Loading...</div>
                    ) : (
                        <div className="flex justify-center">
                            <GoogleLogin
                                onSuccess={handleGoogleLogin}
                                onError={() => {
                                    console.log("Login Failed");
                                    alert("Login Failed");
                                }}
                                theme="outline"
                                shape="circle"
                                text="signup_with"
                            />
                        </div>
                    )}
                </div>

                <div className="relative flex items-center py-5">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-gray-500">OR</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email:
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                    
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Parolă:
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-md bg-[#FFAE1F] px-4 py-2 text-white hover:bg-[#E59C1C] focus:outline-none focus:ring-2 focus:ring-[#FFAE1F] focus:ring-offset-2"
                    >
                        {loginLoading ? "Loading..." : "Autentificare"}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/signup')}
                        className="w-full px-4 py-2 text-white bg-gray-600 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                        Crează cont
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;