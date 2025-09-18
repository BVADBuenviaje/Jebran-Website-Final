import React, { useState } from "react";

const initialState = {
  name: "",
  contact_number: "",
  email: "",
  address: "",
  is_active: true,
};

const SupplierForm = ({ onSubmit, initialSupplier }) => {
  const [form, setForm] = useState(initialSupplier || initialState);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-orange-500">Supplier Form</h2>
      <div className="mb-4">
        <label className="block mb-1 font-semibold text-orange-500" htmlFor="name">Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border-2 border-orange-400 rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-semibold text-orange-500" htmlFor="contact_number">Contact Number</label>
        <input
          type="text"
          id="contact_number"
          name="contact_number"
          value={form.contact_number}
          onChange={handleChange}
          className="w-full px-3 py-2 border-2 border-orange-400 rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-semibold text-orange-500" htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          className="w-full px-3 py-2 border-2 border-orange-400 rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-semibold text-orange-500" htmlFor="address">Address</label>
        <input
          type="text"
          id="address"
          name="address"
          value={form.address}
          onChange={handleChange}
          className="w-full px-3 py-2 border-2 border-orange-400 rounded"
        />
      </div>
      <div className="mb-4 flex items-center">
        <input
          type="checkbox"
          id="is_active"
          name="is_active"
          checked={form.is_active}
          onChange={handleChange}
          className="mr-2"
        />
        <label htmlFor="is_active" className="font-semibold text-orange-500">Active</label>
      </div>
      <button
        type="submit"
        className="w-full py-2 px-4 bg-orange-500 text-white font-bold rounded hover:bg-orange-600 transition-colors"
      >
        Submit
      </button>
    </form>
  );
};

export default SupplierForm;