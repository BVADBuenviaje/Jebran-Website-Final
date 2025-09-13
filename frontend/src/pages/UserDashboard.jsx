import React, { useState, useEffect } from "react";
import StatBox from "../components/CountBox";
import RoleCheckboxes from "../components/RoleCheckboxes";
import UserList from "../components/UserList";
import "../styles/UserDashboard.css";

const ORANGE = "#f89c4e";

const UserDashboard = () => {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState(0);
  const [resellers, setResellers] = useState(0);
  const [admins, setAdmins] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [selectedRoles, setSelectedRoles] = useState(["admin", "reseller", "customer"]);
  const [orderBy, setOrderBy] = useState("chronological"); // "alphabetical" or "chronological"

  useEffect(() => {
    const token = localStorage.getItem("access");
    fetch(`${import.meta.env.VITE_ACCOUNTS_URL}/users/`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    })
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

  // Filter logic for blocked and roles
  let filteredUsers = users.filter(u => {
    if (selectedRoles.length === 0) return true;
    if (selectedRoles.includes("blocked") && u.is_blocked) return true;
    return selectedRoles.includes(u.role) && !u.is_blocked;
  });

  // Order logic
  if (orderBy === "alphabetical") {
    filteredUsers = [...filteredUsers].sort((a, b) =>
      a.username.localeCompare(b.username)
    );
  } else {
    // chronological: sort by date_joined ascending
    filteredUsers = [...filteredUsers].sort((a, b) =>
      new Date(a.date_joined) - new Date(b.date_joined)
    );
  }

  const handleRoleFilterChange = (role) => {
    setSelectedRoles((prev) =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleRoleChange = (user, newRole) => {
    const token = localStorage.getItem("access");
    fetch(`${import.meta.env.VITE_ACCOUNTS_URL}/users/${user.id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ role: newRole }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update role");
        return res.json();
      })
      .then((updatedUser) => {
        setUsers((prev) =>
          prev.map(u => u.id === user.id ? updatedUser : u)
        );
      })
      .catch((err) => {
        alert("Role change failed: " + err.message);
      });
  };

  const handleBlock = (user) => {
    const token = localStorage.getItem("access");
    fetch(`${import.meta.env.VITE_ACCOUNTS_URL}/users/${user.id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ is_blocked: user.is_blocked }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update block status");
        return res.json();
      })
      .then((updatedUser) => {
        setUsers((prev) =>
          prev.map(u => u.id === user.id ? updatedUser : u)
        );
      })
      .catch((err) => {
        alert("Block/unblock failed: " + err.message);
      });
  };

  return (
    <div className="w-full h-screen flex flex-col items-center justify-start overflow-hidden" style={{ background: "#fff" }}>
      <div
        className="pb-3 w-full max-w-6xl h-full mx-auto flex flex-col shadow-2xl"
        style={{
          background: "#fff",
          boxShadow: `
            0 0 160px 60px rgba(187, 87, 0, 0.58),   /* left/right spread */
            0 0 240px 80px rgba(248,156,78,0.25) inset
          `,
          borderRadius: "1rem",
          paddingLeft: "48px",   // Increased left padding
          paddingRight: "48px",  // Increased right padding
        }}
      >
        <div style={{ height: "75px" }} />
        <div className="flex w-full mb-4 px-0">
          <StatBox label="User Requests" value={requests} />
          <StatBox label="Active Resellers" value={resellers} />
          <StatBox label="Admins" value={admins} />
          <StatBox label="Blocked Users" value={blocked} />
        </div>
        <div style={{ height: "32px" }} />
        <div className="flex w-full px-4 mb-2 items-center">
          <select
            value={orderBy}
            onChange={e => setOrderBy(e.target.value)}
            className="px-3 py-1 rounded-full border-2 font-semibold" // <-- border-4 for thicker border
            style={{
              minWidth: "200px",
              maxWidth: "230px",
              height: "36px",
              background: "#fffbe8",
              color: ORANGE,
              borderColor: ORANGE,
            }}
          >
            <option value="alphabetical">Order: Alphabetical</option>
            <option value="chronological">Order: Chronological</option>
          </select>
        </div>
        <div className="flex w-full px-4 mb-2 items-center justify-between" style={{ height: "48px" }}>
          <div className="flex items-center h-full">
            <RoleCheckboxes selectedRoles={selectedRoles} onChange={handleRoleFilterChange} />
          </div>
          <div className="flex items-center h-full" style={{ position: "relative", width: "340px", maxWidth: "340px" }}>
            <input
              type="text"
              placeholder="Search users..."
              className="pl-4 pr-10 py-1 rounded-full border-2 w-full"
              style={{
                borderColor: ORANGE,
                background: "#fffbe8",
                color: ORANGE,
                fontWeight: "bold",
                height: "34px",
                marginTop: "2px",
              }}
            />
            <span
              className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
              style={{ zIndex: 2, color: ORANGE }}
              tabIndex={0}
              role="button"
              title="Search"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
          </div>
        </div>
        <div
          className="w-full px-4 mt-3 flex-1 flex flex-col"
          style={{
            minHeight: 0,
            height: "100%",
          }}
        >
          <div className="flex font-bold text-lg px-4" style={{ flex: "0 0 auto", marginBottom: "18px", color: ORANGE }}>
            <span className="flex-1">Username</span>
            <span className="flex-1">Shop Name</span>
            <span className="flex-1">Email</span>
            <span className="flex-1">Role</span>
            <span className="flex-1">Last Active</span>
            <span className="w-32"></span>
          </div>
          <div
            className="flex-1 overflow-y-auto pb-4 userListScroll"
            style={{
              minHeight: 0,
            }}
          >
            <UserList
              users={filteredUsers}
              onRoleChange={handleRoleChange}
              onBlock={handleBlock}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;