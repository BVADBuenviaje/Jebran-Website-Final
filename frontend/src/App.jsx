import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import UserProfile from './pages/UserProfile';
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import UserDashboard from "./pages/UserDashboard";
import Home from "./pages/Home";

const ProtectedDashboard = () => {
  const token = localStorage.getItem("access");
  const [role, setRole] = React.useState(null);

  React.useEffect(() => {
    if (!token) return;
    fetch(`${import.meta.env.VITE_ACCOUNTS_URL}/users/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.role) setRole(data.role);
      });
  }, [token]);

  if (!token) return <Navigate to="/login" />;
  if (role === null) return null; // loading
  if (role !== "admin") return <Navigate to="/" />;
  return <UserDashboard />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedDashboard />} />
        <Route path="*" element={<div>404 Not Found</div>} />
        <Route path="/admin/users/:id" element={<UserProfile />} />
      </Routes>
    </Router>
  );
}

export default App;