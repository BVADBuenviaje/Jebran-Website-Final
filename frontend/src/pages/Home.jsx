import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Home = () => {
  const [role, setRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return;
    fetch("http://127.0.0.1:8000/api/accounts/users/me/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.role) setRole(data.role);
      });
  }, []);

  // If reseller tries to access /dashboard, redirect to home
  useEffect(() => {
    if (role === "reseller" && window.location.pathname === "/dashboard") {
      navigate("/");
    }
  }, [role, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Welcome Home!</h1>
      {role === "admin" && (
        <Link
          to="/dashboard"
          className="px-6 py-2 bg-yellow-900 text-white rounded hover:bg-yellow-800 transition-colors"
        >
          Go to Dashboard
        </Link>
      )}
    </div>
  );
};

export default Home;