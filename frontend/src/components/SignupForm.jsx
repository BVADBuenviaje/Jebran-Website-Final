import React, { useState } from "react";

const SignupForm = ({ onSubmit, error, setError, children }) => {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    username: "",
    shop_name: "",
    shop_address: "",
    password: "",
    confirm_password: "",
    contact_number: "",
    proof_of_business: null,
    role: "customer",
  });

  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation for all fields
  const allValid =
    form.full_name &&
    form.email &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.username &&
    form.shop_name &&
    form.shop_address &&
    form.password &&
    form.confirm_password &&
    form.password === form.confirm_password &&
    form.contact_number &&
    form.proof_of_business;

  // Password format validation
  const passwordValid =
    typeof form.password === "string" &&
    form.password.length >= 8 &&
    /[a-zA-Z]/.test(form.password) &&
    /\d/.test(form.password);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
    setSubmitted(false);
    if (setError) setError(""); // Clear error on change
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);

    // Show error if password format is invalid
    if (!passwordValid) {
      if (typeof setError === "function") {
        setError("Password must be at least 8 characters and contain both letters and numbers.");
      }
      return;
    }

    // Only show confirmation modal if all fields are valid and password is valid
    if (allValid && passwordValid && !error) {
      setShowConfirm(true);
    }
    // Otherwise, errors will show as usual
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    onSubmit(form);
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="min-h-screen flex flex-col justify-center max-w-md w-full bg-white p-8 shadow-md mx-auto"
    >
      <h1 className="text-2xl font-bold font-montserrat text-center mb-6 tracking-widest text-orange-900">
        SIGN UP
      </h1>

      {/* Scrollable fields container */}
      <div className="flex-1 overflow-y-auto space-y-4 signup-scrollbar" style={{ maxHeight: "650px" }}>
        <div>
          <label htmlFor="full_name" className="block mb-1 font-medium text-gray-700">
            Full Name
          </label>
          <input
            id="full_name"
            name="full_name"
            placeholder="Full Name"
            value={form.full_name}
            onChange={handleChange}
            className="w-full px-4 py-2 border-2 border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          />
          {submitted && !form.full_name && (
            <div className="mt-1 text-red-500 text-sm bg-red-100 p-2 rounded">
              Please enter your full name.
            </div>
          )}
        </div>
        <div>
          <label htmlFor="email" className="block mb-1 font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border-2 border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          />
          {submitted && !form.email && (
            <div className="mt-1 text-red-500 text-sm bg-red-100 p-2 rounded">
              Please enter your email.
            </div>
          )}
          {submitted && form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && (
            <div className="mt-1 text-red-500 text-sm bg-red-100 p-2 rounded">
              Please enter a valid email address.
            </div>
          )}
        </div>
        <div>
          <label htmlFor="username" className="block mb-1 font-medium text-gray-700">
            Username
          </label>
          <input
            id="username"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            className="w-full px-4 py-2 border-2 border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          />
          {submitted && !form.username && (
            <div className="mt-1 text-red-500 text-sm bg-red-100 p-2 rounded">
              Please enter your username.
            </div>
          )}
        </div>
        <div>
          <label htmlFor="shop_name" className="block mb-1 font-medium text-gray-700">
            Shop Name
          </label>
          <input
            id="shop_name"
            name="shop_name"
            placeholder="Shop Name"
            value={form.shop_name}
            onChange={handleChange}
            className="w-full px-4 py-2 border-2 border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          />
          {submitted && !form.shop_name && (
            <div className="mt-1 text-red-500 text-sm bg-red-100 p-2 rounded">
              Please enter your shop name.
            </div>
          )}
        </div>
        <div>
          <label htmlFor="shop_address" className="block mb-1 font-medium text-gray-700">
            Shop Address
          </label>
          <input
            id="shop_address"
            name="shop_address"
            placeholder="Shop Address"
            value={form.shop_address}
            onChange={handleChange}
            className="w-full px-4 py-2 border-2 border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          />
          {submitted && !form.shop_address && (
            <div className="mt-1 text-red-500 text-sm bg-red-100 p-2 rounded">
              Please enter your shop address.
            </div>
          )}
        </div>
        <div className="flex gap-4">
          <div className="w-1/2">
            <label htmlFor="password" className="block mb-1 font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border-2 border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer pr-10"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
              >
                {showPassword ? (
                  // Eye open icon
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 5-4.03 9-9 9S3 17 3 12 7.03 3 12 3s9 4.03 9 9z" />
                  </svg>
                ) : (
                  // Eye closed icon
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M9.53 9.53A3 3 0 0012 15a3 3 0 002.47-5.47M6.26 6.26C4.09 8.09 3 10.5 3 12c0 5 4.03 9 9 9 1.5 0 2.91-.41 4.14-1.14M17.74 17.74C19.91 15.91 21 13.5 21 12c0-5-4.03-9-9-9-1.5 0-2.91.41-4.14 1.14" />
                  </svg>
                )}
              </button>
            </div>
            {submitted && !form.password && (
              <div className="mt-1 text-red-500 text-sm bg-red-100 p-2 rounded">
                Please enter your password.
              </div>
            )}
          </div>
          <div className="w-1/2">
            <label htmlFor="confirm_password" className="block mb-1 font-medium text-gray-700">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirm_password"
                name="confirm_password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={form.confirm_password}
                onChange={handleChange}
                className="w-full px-4 py-2 border-2 border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer pr-10"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  // Eye open icon
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 5-4.03 9-9 9S3 17 3 12 7.03 3 12 3s9 4.03 9 9z" />
                  </svg>
                ) : (
                  // Eye closed icon
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M9.53 9.53A3 3 0 0012 15a3 3 0 002.47-5.47M6.26 6.26C4.09 8.09 3 10.5 3 12c0 5 4.03 9 9 9 1.5 0 2.91-.41 4.14-1.14M17.74 17.74C19.91 15.91 21 13.5 21 12c0-5-4.03-9-9-9-1.5 0-2.91.41-4.14 1.14" />
                  </svg>
                )}
              </button>
            </div>
            {submitted && !form.confirm_password && (
              <div className="mt-1 text-red-500 text-sm bg-red-100 p-2 rounded">
                Please confirm your password.
              </div>
            )}
          </div>
        </div>
        {submitted && form.password && form.confirm_password && form.password !== form.confirm_password && (
          <div className="mt-1 text-red-500 text-sm bg-red-100 p-2 rounded">
            Passwords do not match.
          </div>
        )}
        <div>
          <label htmlFor="contact_number" className="block mb-1 font-medium text-gray-700">
            Contact Number
          </label>
          <input
            id="contact_number"
            name="contact_number"
            placeholder="Contact Number"
            value={form.contact_number}
            onChange={handleChange}
            className="w-full px-4 py-2 border-2 border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          />
          {submitted && !form.contact_number && (
            <div className="mt-1 text-red-500 text-sm bg-red-100 p-2 rounded">
              Please enter your contact number.
            </div>
          )}
        </div>
        <div>
          <label htmlFor="proof_of_business" className="block mb-1 font-medium text-gray-700">
            Proof of Business
          </label>
          <input
            id="proof_of_business"
            name="proof_of_business"
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="w-full px-4 py-2 border-2 border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          />
          {submitted && !form.proof_of_business && (
            <div className="mt-1 text-red-500 text-sm bg-red-100 p-2 rounded">
              Please upload proof of business.
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
            <p className="text-lg font-semibold mb-4 text-center">
              Are you sure the information for all the fields are correct?
            </p>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                className="min-w-[120px] px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="min-w-[120px] px-4 py-2 border-2 border-yellow-900 text-white bg-yellow-900 rounded focus:outline-none focus:ring-2 hover:bg-yellow-800 hover:border-yellow-800 transition-colors"
                onClick={handleConfirm}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="w-full mt-4 px-4 py-2 border-2 border-yellow-900 text-white bg-yellow-900 rounded focus:outline-none focus:ring-2 hover:bg-yellow-800 hover:border-yellow-800 transition-colors"
        disabled={
          submitted &&
          (
            !form.full_name ||
            !form.email ||
            !form.username ||
            !form.shop_name ||
            !form.shop_address ||
            !form.password ||
            !form.confirm_password ||
            !form.contact_number ||
            !form.proof_of_business ||
            form.password !== form.confirm_password ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
          )
        }
      >
        Sign Up
      </button>
      {children}
    </form>
  );
};

export default SignupForm;