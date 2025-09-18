import React from "react";
import UserRow from "./UserRow";

const UserList = ({ users, onRoleChange, onBlock }) => (
  <div className="flex flex-col w-full gap-1">
    {/* User rows */}
    {users.length === 0 ? (
      <div className="text-white px-4 py-4">No users found.</div>
    ) : (
      users.map(user => (
        <UserRow
          key={user.id}
          user={user}
          onRoleChange={onRoleChange}
          onBlock={onBlock}
        />
      ))
    )}
  </div>
);

export default UserList;