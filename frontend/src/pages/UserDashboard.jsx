import React, { useState, useEffect } from "react";
import StatBox from "../components/CountBox";
import RoleCheckboxes from "../components/RoleCheckboxes";
import UserList from "../components/UserList";
import "../styles/UserDashboard.css";

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
    <div className="w-full h-screen flex flex-col items-center justify-start bg-[url('/background.jpg')] bg-cover bg-center overflow-hidden">
      <div
        className="pb-3 w-full max-w-5xl h-full mx-auto flex flex-col"
        style={{ background: "transparent" }}
      >
        {/* Add more space at the top */}
        <div style={{ height: "75px" }} />
        {/* Stat Boxes */}
        <div className="flex w-full mb-4 px-0">
          <StatBox label="User Requests" value={requests} />
          <StatBox label="Active Resellers" value={resellers} />
          <StatBox label="Admins" value={admins} />
          <StatBox label="Blocked Users" value={blocked} />
        </div>
        {/* Increase vertical space below stat boxes */}
        <div style={{ height: "32px" }} />
        {/* Order By Dropdown */}
        <div className="flex w-full px-4 mb-2 items-center">
          <select
            value={orderBy}
            onChange={e => setOrderBy(e.target.value)}
            className="px-3 py-1 rounded-full border font-semibold bg-gray-200 text-yellow-900 border-yellow-900 focus:outline-none text-sm appearance-none"
            style={{ minWidth: "140px", maxWidth: "180px", height: "36px" }}
          >
            <option value="alphabetical">
              Order: Alphabetical
            </option>
            <option value="chronological">
              Order: Chronological
            </option>
          </select>
        </div>
        {/* Role Filter and Search Bar */}
        <div className="flex w-full px-4 mb-2 items-center justify-between" style={{ height: "48px" }}>
          <div className="flex items-center h-full">
            <RoleCheckboxes selectedRoles={selectedRoles} onChange={handleRoleFilterChange} />
          </div>
          <div className="flex items-center h-full" style={{ position: "relative", width: "340px", maxWidth: "340px" }}>
            {/* Search Icon (right side) */}
            <input
              type="text"
              placeholder="Search users..."
              className="pl-4 pr-10 py-1 rounded-full border-2 border-white bg-transparent text-white text-sm font-semibold focus:outline-none placeholder:text-gray-200 w-full"
              style={{ height: "34px", marginTop: "2px" }}
              // No functionality yet
            />
            <span
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white cursor-pointer"
              style={{ zIndex: 2 }}
              tabIndex={0}
              role="button"
              title="Search"
              // No click handler yet
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
          </div>
        </div>
        {/* User List Table */}
        <div
          className="w-full px-4 mt-3 flex-1 flex flex-col"
          style={{
            minHeight: 0,
            height: "100%",
          }}
        >
          {/* Table Headers */}
          <div className="flex font-bold text-white text-lg px-4" style={{ flex: "0 0 auto", marginBottom: "18px" }}>
            <span className="flex-1">Username</span>
            <span className="flex-1">Shop Name</span>
            <span className="flex-1">Email</span>
            <span className="flex-1">Role</span>
            <span className="flex-1">Last Active</span>
            <span className="w-32"></span>
          </div>
          {/* Scrollable User List */}
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