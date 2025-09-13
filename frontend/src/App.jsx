import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import UserDashboard from "./pages/UserDashboard";
import Home from "./pages/Home";
import Navbar from "./components/NavBar";

function AppContent() {
  const [role, setRole] = React.useState(null);
  const token = localStorage.getItem("access");
  const location = useLocation();

  React.useEffect(() => {
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
      });
  }, [token]);

  // Protected route for dashboard
  const ProtectedDashboard = () => {
    if (!token) return <Navigate to="/login" />;
    if (role === null) return null; // loading
    if (role !== "admin") return <Navigate to="/" />;
    return <UserDashboard />;
  };

  // Hide navbar on login and signup pages
  const hideNavbar = location.pathname === "/login" || location.pathname === "/signup";

  return (
    <>
      {!hideNavbar && <Navbar role={role} />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedDashboard />} />
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}