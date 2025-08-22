import React from "react";
import UserRow from "./UserRow";

const UserList = ({ users, onRoleChange, onDelete }) => (
  <div className="flex flex-col w-full mt-8 gap-4">
    {/* Header row */}
    <div className="flex font-bold text-white text-lg px-4">
      <span className="flex-1">Username</span>
      <span className="flex-1">Shop Name</span>
      <span className="flex-1">Email</span>
      <span className="flex-1">Role</span>
      <span className="flex-1">Last Active</span>
      <span className="w-32"></span>
    </div>
    {/* User rows */}
    {users.length === 0 ? (
      <div className="text-white px-4 py-4">No users found.</div>
    ) : (
      users.map(user => (
        <UserRow
          key={user.id}
          user={user}
          onRoleChange={onRoleChange}
          onDelete={onDelete}
        />
      ))
    )}
  </div>
);

export default UserList;