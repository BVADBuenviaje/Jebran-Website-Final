import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, FileText } from "lucide-react";

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
        Authorization: `Bearer ${token}`,
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
      .catch(() => setLoading(false));
  }, [id]);

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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Left side - User Information */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b">
                <User className="w-4 h-4 text-[#B8705F]" />
                <h3 className="text-sm font-semibold">User Details</h3>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Email:
                </h3>
                <p className="text-sm">{user.email || "—"}</p>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Contact Number:
                </h3>
                <p className="text-sm text-muted-foreground">
                  {user.contact_number || "—"}
                </p>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Role:
                </h3>
                <p className="text-sm">{user.role || "—"}</p>
              </div>

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

              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Shop Name:
                </h3>
                <p className="text-sm text-muted-foreground">
                  {user.shop_name || "—"}
                </p>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Address:
                </h3>
                <p className="text-sm text-muted-foreground">
                  {user.shop_address || "—"}
                </p>
              </div>

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