import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import { useCart } from "../contexts/CartContext";

const Login = () => {
  const [error, setError] = useState("");
  const [pendingModal, setPendingModal] = useState(false);
  const [blockedModal, setBlockedModal] = useState(false);
  const [loginErrorModal, setLoginErrorModal] = useState(false);
  const { setToken } = useCart();
  const navigate = useNavigate();

  const handleLogin = async (form) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_ACCOUNTS_URL}/token/`,
        form
      );
      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);
      setToken(response.data.access); // <-- Add this line

      // Fetch user profile to check role and blocked status
      const userRes = await axios.get(
        `${import.meta.env.VITE_ACCOUNTS_URL}/users/me/`,
        { headers: { Authorization: `Bearer ${response.data.access}` } }
      );
      const role = userRes.data.role;
      const isBlocked = userRes.data.is_blocked;

      // Save username for dashboard self-role protection
      localStorage.setItem("username", userRes.data.username);

      if (isBlocked) {
        setBlockedModal(true);
        return;
      }

      if (role !== "reseller" && role !== "admin" && !userRes.data.is_superuser) {
        setPendingModal(true);
        return;
      }

      navigate("/");
    } catch (err) {
      let msg = err.response?.data?.detail || err.response?.data || "Login failed.";
      if (typeof msg !== "string" && msg) {
        msg = msg.detail || JSON.stringify(msg);
      }
      if (
        typeof msg === "string" &&
        (msg.toLowerCase().includes("no active account found") ||
         msg.toLowerCase().includes("incorrect password"))
      ) {
        setLoginErrorModal(true);
        msg = ""; // Don't show inline error
      }
      // Handle blocked user error from backend
      if (
        typeof msg === "string" &&
        msg.toLowerCase().includes("blocked")
      ) {
        setBlockedModal(true);
        msg = "";
      }
      setError(msg);
    }
  };

  const handlePendingModalHome = () => {
    setPendingModal(false);
    navigate("/");
  };

  const handleBlockedModalHome = () => {
    setBlockedModal(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#ffaa5fff" }}>
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
                Your account is pending verification. Please wait for an email confirmation. Go back to home page?
              </p>
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  className="min-w-[120px] px-4 py-2 rounded focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    background: "#b95700", // darker orange for Cancel
                    color: "#fffbe8",
                    border: "none",
                    borderRadius: "2rem",
                  }}
                  onMouseEnter={e => (e.target.style.background = "#a04a00")}
                  onMouseLeave={e => (e.target.style.background = "#b95700")}
                  onClick={() => setPendingModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="min-w-[120px] px-4 py-2 rounded focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    background: "#f89c4e", // regular orange for Go to Home
                    color: "#fffbe8",
                    border: "none",
                    borderRadius: "2rem",
                  }}
                  onMouseEnter={e => (e.target.style.background = "#f08b51")}
                  onMouseLeave={e => (e.target.style.background = "#f89c4e")}
                  onClick={handlePendingModalHome}
                >
                  Go to Home
                </button>
              </div>
            </div>
          </div>
        )}
        {blockedModal && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
              <p className="text-lg font-semibold mb-4 text-center">
                Your account has been restricted and you cannot log in. Please contact support if you believe this is a mistake.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  className="min-w-[120px] px-4 py-2 rounded focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    background: "#b95700", // darker orange for Cancel
                    color: "#fffbe8",
                    border: "none",
                    borderRadius: "2rem",
                  }}
                  onMouseEnter={e => (e.target.style.background = "#a04a00")}
                  onMouseLeave={e => (e.target.style.background = "#b95700")}
                  onClick={() => setBlockedModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="min-w-[120px] px-4 py-2 rounded focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    background: "#f89c4e", // regular orange for Go to Home
                    color: "#fffbe8",
                    border: "none",
                    borderRadius: "2rem",
                  }}
                  onMouseEnter={e => (e.target.style.background = "#f08b51")}
                  onMouseLeave={e => (e.target.style.background = "#f89c4e")}
                  onClick={handleBlockedModalHome}
                >
                  Go to Home
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
                  className="w-24 px-4 py-2 rounded focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    background: "#f89c4e",
                    color: "#fffbe8",
                    border: "none",
                    borderRadius: "2rem",
                  }}
                  onMouseEnter={e => (e.target.style.background = "#f08b51")}
                  onMouseLeave={e => (e.target.style.background = "#f89c4e")}
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