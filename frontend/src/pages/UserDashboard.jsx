import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import StatBox from "../components/CountBox";
import RoleCheckboxes from "../components/RoleCheckboxes";
import UserList from "../components/UserList";
import { fetchWithAuth } from "../utils/auth";
import "../styles/UserDashboard.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserShield, faUserTie, faUser, faBan } from "@fortawesome/free-solid-svg-icons";

const ORANGE = "#f89c4e";

const UserDashboard = () => {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState(0);
  const [resellers, setResellers] = useState(0);
  const [admins, setAdmins] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [selectedRoles, setSelectedRoles] = useState(["admin", "reseller", "customer"]);
  const [orderBy, setOrderBy] = useState("chronological");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    fetchWithAuth(`${import.meta.env.VITE_ACCOUNTS_URL}/users/`)
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    setRequests(users.filter(u => u.role === "customer").length);
    setResellers(users.filter(u => u.role === "reseller").length);
    setAdmins(users.filter(u => u.role === "admin").length);
    setBlocked(users.filter(u => u.is_blocked).length);
  }, [users]);

  useEffect(() => {
    const token = localStorage.getItem("access"); // replace with your actual token key!
    if (!token) {
      setRole(null);
      setLoadingRole(false);
      return;
    }
    fetchWithAuth(`${import.meta.env.VITE_ACCOUNTS_URL}/users/me/`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        setRole(data?.role || null);
        setLoadingRole(false);
      })
      .catch(() => {
        setRole(null);
        setLoadingRole(false);
      });
  }, []);

  // Debug: See what role is being set
  console.log("Role:", role);

  let filteredUsers = users
    .filter(u => {
      if (selectedRoles.length === 0) return true;
      if (selectedRoles.includes("blocked") && u.is_blocked) return true;
      return selectedRoles.includes(u.role) && !u.is_blocked;
    })
    .filter(u =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.shop_name || "").toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    );

  if (orderBy === "alphabetical") {
    filteredUsers = [...filteredUsers].sort((a, b) =>
      a.username.localeCompare(b.username)
    );
  } else {
    filteredUsers = [...filteredUsers].sort(
      (a, b) => new Date(a.date_joined) - new Date(b.date_joined)
    );
  }

  const handleRoleFilterChange = (role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleRoleChange = (user, newRole) => {
    fetchWithAuth(`${import.meta.env.VITE_ACCOUNTS_URL}/users/${user.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update role");
        return res.json();
      })
      .then((updatedUser) => {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
      })
      .catch((err) => {
        alert("Role change failed: " + err.message);
      });
  };

  const handleBlock = (user) => {
    fetchWithAuth(`${import.meta.env.VITE_ACCOUNTS_URL}/users/${user.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_blocked: user.is_blocked }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update block status");
        return res.json();
      })
      .then((updatedUser) => {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
      })
      .catch((err) => {
        alert("Block/unblock failed: " + err.message);
      });
  };

  if (loadingRole) return <div className="text-center py-10">Loading...</div>;
  if (role !== "admin") return <Navigate to="/login" />;

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-white">
      <div className="h-full w-[85vw] bg-white rounded-xl shadow-lg flex flex-col px-[2.5%] pb-8">
        <div style={{ height: "11%" }} />
        <div className="w-full flex flex-row justify-between items-center font-[Helvetica] h-[10%]">
          <div className="flex flex-col w-1/2 h-full">
            <h1 className="m-0 text-[2.3rem] font-bold text-[#472922ff] tracking-[0.05rem] font-[inherit]">
              User Management
            </h1>
            <p className="m-0 mt-1 text-[1.1rem] text-[#472922ff] font-[inherit] font-normal tracking-[0.05rem]">
              Manage user accounts, roles, and access.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="w-full flex flex-row items-center gap-x-6" style={{ height: "13%", marginTop: "1%" }}>
          <StatBox
            label="User Requests"
            value={requests}
            icon={<FontAwesomeIcon icon={faUser} size="2x" className="text-[#472922ff]" />}
          />
          <StatBox
            label="Active Resellers"
            value={resellers}
            icon={<FontAwesomeIcon icon={faUserTie} size="2x" className="text-[#f89c4e]" />}
          />
          <StatBox
            label="Admins"
            value={admins}
            icon={<FontAwesomeIcon icon={faUserShield} size="2x" className="text-[#bb6653]" />}
          />
          <StatBox
            label="Blocked Users"
            value={blocked}
            icon={<FontAwesomeIcon icon={faBan} size="2x" className="text-[#bb6653]" />}
          />
        </div>

        {/* Filters + Search */}
        <div className="w-full flex-1 flex flex-col gap-2" style={{ marginTop: "1.5%", minHeight: 0 }}>
          <div className="w-full flex flex-row items-center justify-between mb-6">
            <RoleCheckboxes selectedRoles={selectedRoles} onChange={handleRoleFilterChange} />
            <div className="flex items-center" style={{ width: "340px", maxWidth: "340px" }}>
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-4 pr-10 py-1.5 rounded-full border-2 w-full text-[#472922ff] font-semibold"
                  style={{
                    borderColor: ORANGE,
                    background: "#fffbe8",
                    fontFamily: "inherit",
                    height: "2.25rem",
                  }}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#f89c4e]">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable header + list */}
          <div
            className="flex-1 overflow-y-auto userListScroll"
            style={{ minHeight: 0, maxHeight: "100%", padding: "0 8px 8px 8px" }}
          >
            <div className="bg-white sticky top-0 z-10 text-lg font-bold border-b" style={{ color: ORANGE }}>
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_8rem] items-center px-2">
                <span className="px-4 py-3">Username</span>
                <span className="px-4 py-3">Shop Name</span>
                <span className="px-4 py-3">Email</span>
                <span className="px-4 py-3">Role</span>
                <span className="px-4 py-3">Last Active</span>
                <span className="px-4 py-3"></span>
              </div>
            </div>

            <div className="pt-2 pb-4">
              <UserList users={filteredUsers} onRoleChange={handleRoleChange} onBlock={handleBlock} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;