import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Home = () => {
  const [role, setRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      setRole(null);
      return;
    }
    fetch(`${import.meta.env.VITE_ACCOUNTS_URL}/users/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.role) setRole(data.role);
        else setRole(null);
      })
      .catch(() => setRole(null));
  }, []);

  useEffect(() => {
    if (role === "reseller" && window.location.pathname === "/dashboard") {
      navigate("/");
    }
  }, [role, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setRole(null);
    navigate("/login");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {role ? (
        <>
          <h1 className="text-3xl font-bold mb-6">Welcome Home!</h1>
          {role === "admin" && (
            <Link
              to="/dashboard"
              className="px-6 py-2 bg-yellow-900 text-white rounded hover:bg-yellow-800 transition-colors mb-4"
            >
              Go to Dashboard
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-6">Welcome to Jebran Website!</h1>
          <div className="flex gap-4">
            <Link
              to="/login"
              className="px-6 py-2 bg-yellow-900 text-white rounded hover:bg-yellow-800 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
            >
              Signup
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default Home;