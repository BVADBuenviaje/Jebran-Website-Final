import React, { useState, useEffect } from "react";
import StatBox from "../components/CountBox";
import RoleCheckboxes from "../components/RoleCheckboxes";
import UserList from "../components/UserList";

const UserDashboard = () => {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState(0);
  const [resellers, setResellers] = useState(0);
  const [admins, setAdmins] = useState(0);
  const [selectedRoles, setSelectedRoles] = useState(["admin", "reseller", "customer"]);

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
  }, [users]);

  const filteredUsers = users.filter(u => selectedRoles.length === 0 ? true : selectedRoles.includes(u.role));

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

  const handleDelete = (user) => {
    const token = localStorage.getItem("access");
    fetch(`http://127.0.0.1:8000/api/accounts/users/${user.id}/`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    })
      .then(() => {
        setUsers((prev) => prev.filter(u => u.id !== user.id));
      })
      .catch((err) => console.error(err));
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start bg-[url('/background.jpg')] bg-cover bg-center">
      <div className="mt-20 w-full max-w-5xl min-h-screen mx-auto flex flex-col" style={{ background: "transparent" }}>
        {/* Stat Boxes */}
        <div className="flex w-full mb-12 px-0">
          <StatBox label="User Requests" value={requests} />
          <StatBox label="Active Resellers" value={resellers} />
          <StatBox label="Admins" value={admins} />
        </div>
        {/* Role Filter */}
        <div className="flex flex-col w-full px-4">
          <RoleCheckboxes selectedRoles={selectedRoles} onChange={handleRoleFilterChange} />
        </div>
        {/* User List Table */}
        <div className="w-full px-4 mt-8">
          <UserList
            users={filteredUsers}
            onRoleChange={handleRoleChange}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;