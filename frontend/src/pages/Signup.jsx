import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import SignupForm from "../components/SignupForm";

const Signup = () => {
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const validatePassword = (password) => {
    // At least 8 characters, contains letters and numbers
    return (
      typeof password === "string" &&
      password.length >= 8 &&
      /[a-zA-Z]/.test(password) &&
      /\d/.test(password)
    );
  };

  const handleSignup = async (form) => {
    if (!validatePassword(form.password)) {
      setError("Password must be at least 8 characters and contain both letters and numbers.");
      return;
    }
    setError(""); // Clear error if password is valid

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== null && value !== "") formData.append(key, value);
    });

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/users/`, formData, {
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
      <SignupForm onSubmit={handleSignup} error={error} setError={setError}>
        <p className="mt-4 text-center">
          Already have an account? <Link to="/login" className="text-blue-500 underline">Login here</Link>
        </p>
      </SignupForm>
    </div>
  );
};

export default Signup;