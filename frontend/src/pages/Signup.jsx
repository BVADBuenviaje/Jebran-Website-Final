import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import SignupForm from "../components/SignupForm";

const Signup = () => {
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (form) => {
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== null && value !== "") formData.append(key, value);
    });

    try {
      await axios.post("http://127.0.0.1:8000/api/users/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate("/login");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        (typeof err.response?.data === "string" ? err.response.data : "Signup failed.")
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/background.jpg')] bg-cover bg-center">
      <SignupForm onSubmit={handleSignup} error={error}>
        <p className="mt-4 text-center">
          Already have an account? <Link to="/login" className="text-blue-500 underline">Login here</Link>
        </p>
      </SignupForm>
    </div>
  );
};

export default Signup;