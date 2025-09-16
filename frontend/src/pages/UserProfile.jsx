import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

 useEffect(() => {
  const token = localStorage.getItem("access");
  fetch(`${import.meta.env.VITE_ACCOUNTS_URL}/users/${id}/`, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    })
    .then((data) => {
      setUser(data);
      setLoading(false);
    })
    .catch((err) => {
      setLoading(false);
      console.error(err);
    });
}, [id]);
 

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found.</div>;

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: 24, border: '1px solid #eee', borderRadius: 8 }}>
      <h2>User Profile</h2>
      <div><strong>Last Active:</strong> {new Date(user.last_active).toLocaleDateString()}</div>
      <div><strong>Name:</strong> {user.full_name || user.username}</div>
      <div><strong>Email:</strong> {user.email}</div>
      <div><strong>Contact Number:</strong> {user.contact_number}</div>
      <div><strong>Role:</strong> {user.role}</div>
      <div><strong>Date Joined:</strong> {new Date(user.date_joined).toLocaleDateString()}</div>
      <div><strong>Shop Name:</strong> {user.shop_name}</div>
      <div><strong>Address:</strong> {user.shop_address}</div>
      {user.proof_of_business && (
        <div style={{ marginTop: 16 }}>
          <strong>Proof of Business:</strong>
          <img 
            src={user.proof_of_business} 
            alt="Proof of Business" 
            style={{ width: "100%", marginTop: 8, borderRadius: 8 }}
          />
        </div>
      )}
      <button style={{ marginTop: 16 }} onClick={() => navigate('/dashboard')}>Back to User List</button>
    </div>
  );
}

export default UserProfile;