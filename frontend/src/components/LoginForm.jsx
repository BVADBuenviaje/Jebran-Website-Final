import React, { useState } from "react";

const LoginForm = ({ onSubmit, error, children }) => {
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [localError, setLocalError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sync error prop to localError
  React.useEffect(() => {
    setLocalError(error);
  }, [error]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setSubmitted(false);
    setLocalError(""); // Clear error when editing
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!form.username || !form.password) return;
    onSubmit(form);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="min-h-screen flex flex-col justify-center max-w-md w-full bg-white p-8 shadow-md space-y-4 mx-auto"
      style={{
          border: "none", // No border
          borderRadius: "1rem",
          boxShadow: "0 0 60px 0 rgba(248,156,78,0.25), 0 0 60px 0 rgba(248,156,78,0.25) inset",
        }}
    >
      <h1 className="text-2xl font-bold font-montserrat text-center mb-6 tracking-widest" style={{ color: "#f08b51" }}>
        LOGIN
      </h1>
      <div>
        <label htmlFor="username" className="block mb-1 font-medium" style={{ color: "#f08b51" }}>
          Username or Email
        </label>
        <input
          id="username"
          name="username"
          placeholder="Username or Email"
          value={form.username}
          onChange={handleChange}
          className="w-full px-4 py-2 border-2 rounded focus:outline-none focus:ring-2 cursor-pointer"
          style={{
            borderColor: "#f08b51",
            background: "#fffbe8",
            color: "#bb6653",
          }}
        />
        {submitted && !form.username && (
          <div className="mt-1 text-red-500 text-sm bg-red-100 p-2 rounded">
            Please enter your username or email.
          </div>
        )}
      </div>
      <div>
        <label htmlFor="password" className="block mb-1 font-medium" style={{ color: "#f08b51" }}>
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
            className="w-full px-4 py-2 border-2 rounded focus:outline-none focus:ring-2 cursor-pointer pr-10"
            style={{
              borderColor: "#f08b51",
              background: "#fffbe8",
              color: "#bb6653",
            }}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            style={{ color: "#bb6653" }}
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
      {/* Custom error message logic here */}
      {localError && localError.toLowerCase().includes("password") ? (
        <p className="text-red-500 text-sm bg-red-100 p-2 rounded">Incorrect password.</p>
      ) : localError && (
        <p className="text-red-500 text-sm bg-red-100 p-2 rounded">{localError}</p>
      )}
      <button
        type="submit"
        className="w-full mt-4 px-4 py-2 border-2 rounded focus:outline-none focus:ring-2 transition-colors cursor-pointer"
        style={{
          borderColor: "#f89c4e", // medium orange border
          background: "#f89c4e",  // medium orange background
          color: "#fffbe8",
          borderRadius: "2rem",
        }}
        onMouseEnter={e => (e.target.style.background = "#f08b51")}
        onMouseLeave={e => (e.target.style.background = "#f89c4e")}
      >
        Login
      </button>
      {children}
    </form>
  );
};

export default LoginForm;