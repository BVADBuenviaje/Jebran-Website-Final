import React, { useState } from "react";

const LoginForm = ({ onSubmit, error, children }) => {
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [localError, setLocalError] = useState("");

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
    >
      <h1 className="text-2xl font-bold font-montserrat text-center mb-6 tracking-widest text-orange-900">LOGIN</h1>
      <div>
        <label htmlFor="username" className="block mb-1 font-medium text-gray-700">Username</label>
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
        <label htmlFor="password" className="block mb-1 font-medium text-gray-700">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="w-full px-4 py-2 border-2 border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
        />
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
        className="w-full mt-4 px-4 py-2 border-2 border-yellow-900 text-white bg-yellow-900 rounded focus:outline-none focus:ring-2 hover:bg-yellow-800 hover:border-yellow-800 transition-colors cursor-pointer"
      >
        Login
      </button>
      {children}
    </form>
  );
};

export default LoginForm;