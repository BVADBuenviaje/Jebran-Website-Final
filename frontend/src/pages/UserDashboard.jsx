import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import RoleCheckboxes from "../components/RoleCheckboxes";
import UserList from "../components/UserList";
import { fetchWithAuth } from "../utils/auth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserShield, faUserTie, faUser, faBan } from "@fortawesome/free-solid-svg-icons";

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
    const token = localStorage.getItem("access");
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

  if (loadingRole) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08b51] mb-4"></div>
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (role !== "admin") return <Navigate to="/login" />;

  const totalUsers = users.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6 mt-20">
            {/* Back button intentionally omitted */}
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
            <p className="text-gray-600">Manage user accounts, roles, and access</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">User Requests</p>
                  <p className="text-3xl font-bold text-[#f08b51] mb-1">{requests}</p>
                  <p className="text-sm text-gray-500">Pending customers</p>
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faUser} className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Active Resellers</p>
                  <p className="text-3xl font-bold text-[#f08b51] mb-1">{resellers}</p>
                  <p className="text-sm text-gray-500">Currently active</p>
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faUserTie} className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Admins</p>
                  <p className="text-3xl font-bold text-[#f08b51] mb-1">{admins}</p>
                  <p className="text-sm text-gray-500">Administrators</p>
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faUserShield} className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Blocked Users</p>
                  <p className="text-3xl font-bold text-[#f08b51] mb-1">{blocked}</p>
                  <p className="text-sm text-gray-500">Currently blocked</p>
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faBan} className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">User Directory</h2>
            <p className="text-gray-600">Manage user accounts and monitor their roles and status</p>
          </div>

          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <RoleCheckboxes selectedRoles={selectedRoles} onChange={handleRoleFilterChange} />
              </div>
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f08b51] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shop Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.shop_name || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === "admin" ? "bg-purple-100 text-purple-800" :
                        user.role === "reseller" ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.last_active ? new Date(user.last_active).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_blocked ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                      }`}>
                        {user.is_blocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                        >
                          <option value="customer">Customer</option>
                          <option value="reseller">Reseller</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleBlock({...user, is_blocked: !user.is_blocked})}
                          className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                            user.is_blocked ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          {user.is_blocked ? "Unblock" : "Block"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;