import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import LoginForm from "../components/LoginForm";

const Login = () => {
  const [error, setError] = useState("");
  const [pendingModal, setPendingModal] = useState(false);
  const [loginErrorModal, setLoginErrorModal] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (form) => {
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/accounts/token/",
        form
      );
      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);

      // Fetch user profile to check role
      const userRes = await axios.get(
        "http://127.0.0.1:8000/api/accounts/users/me/",
        {
          headers: { Authorization: `Bearer ${response.data.access}` },
        }
      );
      const role = userRes.data.role;

      if (role !== "reseller" && role !== "admin") {
        setPendingModal(true);
        return;
      }

      navigate("/");
    } catch (err) {
      let msg = err.response?.data?.detail || err.response?.data || "Login failed.";
      if (
        typeof msg === "string" &&
        (msg.toLowerCase().includes("no active account found") ||
         msg.toLowerCase().includes("incorrect password"))
      ) {
        setLoginErrorModal(true);
        msg = ""; // Don't show inline error
      }
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/background.jpg')] bg-cover bg-center">
      <LoginForm onSubmit={handleLogin} error={error}>
        <p className="mt-4 text-center">
          Don't have an account yet?{" "}
          <Link to="/signup" className="text-blue-500 underline">
            Sign up here
          </Link>
        </p>
        {pendingModal && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
              <p className="text-lg font-semibold mb-4 text-center">
                Your account is pending verification. Please wait for an email confirmation.
              </p>
              <div className="flex justify-center">
                <button
                  type="button"
                  className="w-24 px-4 py-2 bg-yellow-900 text-white rounded hover:bg-yellow-800 transition-colors"
                  onClick={() => setPendingModal(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
        {loginErrorModal && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
              <p className="text-lg font-semibold mb-4 text-center">
                Your username or password is incorrect. Please try again.
              </p>
              <div className="flex justify-center">
                <button
                  type="button"
                  className="w-24 px-4 py-2 bg-yellow-900 text-white rounded hover:bg-yellow-800 transition-colors"
                  onClick={() => setLoginErrorModal(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </LoginForm>
    </div>
  );
};

export default Login;