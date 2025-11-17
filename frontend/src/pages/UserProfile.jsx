import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, FileText, Edit2, Save, X } from "lucide-react";
import { fetchWithAuth } from "../utils/auth";

function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    contact_number: "",
    shop_name: "",
    shop_address: "",
    password: "",
  });

  // Check if current user is viewing their own profile
  useEffect(() => {
    const userId = localStorage.getItem("user.id");
    setCurrentUserId(userId);
  }, []);

  useEffect(() => {
    fetchWithAuth(`${import.meta.env.VITE_ACCOUNTS_URL}/users/${id}/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setFormData({
          full_name: data.full_name || "",
          email: data.email || "",
          contact_number: data.contact_number || "",
          shop_name: data.shop_name || "",
          shop_address: data.shop_address || "",
          password: "",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const isOwnProfile = currentUserId && id && parseInt(currentUserId) === parseInt(id);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");
    setIsSaving(true);

    // Remove password from formData if it's empty
    const dataToSend = { ...formData };
    if (!dataToSend.password) {
      delete dataToSend.password;
    }

    try {
      const token = localStorage.getItem("access");
      const response = await fetch(
        `${import.meta.env.VITE_ACCOUNTS_URL}/users/update_profile/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(dataToSend),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.message || "Failed to update profile");
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setFormData({
        ...formData,
        password: "", // Clear password field after save
      });
      setIsEditing(false);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original user data
    setFormData({
      full_name: user.full_name || "",
      email: user.email || "",
      contact_number: user.contact_number || "",
      shop_name: user.shop_name || "",
      shop_address: user.shop_address || "",
      password: "",
    });
    setIsEditing(false);
    setError("");
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <span className="text-gray-500 text-lg">Loading...</span>
      </div>
    );
  if (!user)
    return (
      <div className="flex justify-center items-center h-64">
        <span className="text-red-500 text-lg">User not found.</span>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-6 py-6 flex justify-center">
        <div className="bg-white shadow-lg rounded-lg p-6 mt-24 w-full">
          <div className="flex flex-col items-center pb-4 border-b mb-6">
            <div className="w-20 h-20 rounded-full bg-[#B8705F] flex items-center justify-center mb-3">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-semibold">
              {user.full_name || user.username}
            </h2>
            <p className="text-xs text-muted-foreground capitalize">
              {user.role} Profile
            </p>
            {isOwnProfile && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#B8705F] rounded-md hover:bg-[#A05F4F] transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Left side - User Information */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#B8705F]" />
                  <h3 className="text-sm font-semibold">User Details</h3>
                </div>
                {isEditing && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-3 h-3" />
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Email - Read Only */}
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Email:
                </h3>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B8705F]"
                  />
                ) : (
                  <p className="text-sm">{user.email || "—"}</p>
                )}
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Full Name:
                </h3>
                {isEditing ? (
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B8705F]"
                  />
                ) : (
                  <p className="text-sm">{user.full_name || "—"}</p>
                )}
              </div>

              {/* Contact Number */}
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Contact Number:
                </h3>
                {isEditing ? (
                  <input
                    type="text"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleInputChange}
                    placeholder="e.g., +63 912 345 6789"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B8705F]"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {user.contact_number || "—"}
                  </p>
                )}
              </div>

              {/* Role - Always Read Only */}
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Role:
                </h3>
                <p className="text-sm capitalize">{user.role || "—"}</p>
              </div>

              {/* Date Joined - Always Read Only */}
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Date Joined:
                </h3>
                <p className="text-sm">
                  {user.date_joined
                    ? new Date(user.date_joined).toLocaleDateString()
                    : "—"}
                </p>
              </div>

              {/* Shop Name */}
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Shop Name:
                </h3>
                {isEditing ? (
                  <input
                    type="text"
                    name="shop_name"
                    value={formData.shop_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B8705F]"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {user.shop_name || "—"}
                  </p>
                )}
              </div>

              {/* Shop Address */}
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Address:
                </h3>
                {isEditing ? (
                  <textarea
                    name="shop_address"
                    value={formData.shop_address}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B8705F]"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {user.shop_address || "—"}
                  </p>
                )}
              </div>

              {/* Password Change - Only when editing */}
              {isEditing && (
                <div className="space-y-1">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Change Password (leave blank to keep current):
                  </h3>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B8705F]"
                  />
                </div>
              )}

              <div className="pt-3">
                <button
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 text-sm text-foreground hover:text-foreground/80 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </div>

            {/* Right side - Proof of Business */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b">
                <FileText className="w-4 h-4 text-[#B8705F]" />
                <h3 className="text-sm font-semibold">Proof of Business</h3>
              </div>

              {user.proof_of_business ? (
                <div className="space-y-3">
                  <div className="h-48 bg-muted rounded-lg overflow-hidden border-2 border-border">
                    <img
                      src={user.proof_of_business}
                      alt="Proof of Business Document"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Document Status</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Verified
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Uploaded on{" "}
                      {user.date_joined
                        ? new Date(user.date_joined).toLocaleDateString()
                        : "—"}
                    </p>
                    {isOwnProfile && (
                      <p className="text-xs text-gray-500 italic">
                        Note: Proof of business cannot be changed after upload.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No proof uploaded.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default UserProfile;