import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import UserProfile from './pages/UserProfile';
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import UserDashboard from "./pages/UserDashboard";
import SupplierDashboard from "./pages/SupplierDashboard";
import Home from "./pages/Home";
import Navbar from "./components/NavBar";
import Ingredients from "./pages/Ingredients";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import AdminCart from "./pages/AdminCart";
import Checkout from "./pages/Checkout";
import { CartProvider } from "./contexts/CartContext";
import ResupplyOrders from "./pages/ResupplyOrders"; // Add this import
import Orders from "./pages/Orders"; // Add this import
import { fetchWithAuth } from "./utils/auth";

function AppContent() {
  const [role, setRole] = React.useState(null);
  const [loadingRole, setLoadingRole] = React.useState(true);
  const token = localStorage.getItem("access");
  const location = useLocation();

  React.useEffect(() => {
    let isMounted = true;
    setLoadingRole(true);
    const fetchRole = async () => {
      if (!token) {
        if (isMounted) {
          setRole(null);
          setLoadingRole(false);
        }
        return;
      }
      try {
        const res = await fetchWithAuth(`${import.meta.env.VITE_ACCOUNTS_URL}/users/me/`);
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setRole(data.role || null);
        } else {
          setRole(null);
        }
      } catch {
        if (isMounted) setRole(null);
      } finally {
        if (isMounted) setLoadingRole(false);
      }
    };
    fetchRole();
    return () => { isMounted = false; };
  }, [token]);

  const ProtectedDashboard = () => {
    if (!token) return <Navigate to="/login" />;
    if (loadingRole) return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08b51] mb-4"></div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    );
    if (role !== "admin") return <Navigate to="/" />;
    return <UserDashboard />;
  };

  const ProtectedSupplierDashboard = () => {
    if (!token) return <Navigate to="/login" />;
    if (loadingRole) return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08b51] mb-4"></div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    );
    if (role !== "admin") return <Navigate to="/" />;
    return <SupplierDashboard />;
  };

  const ProtectedIngredients = () => {
    if (!token) return <Navigate to="/login" />;
    if (loadingRole) return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08b51] mb-4"></div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    );
    if (role !== "admin") return <Navigate to="/" />;
    return <Ingredients />;
  };

  const ProtectedProducts = () => {
    if (!token) return <Navigate to="/login" />;
    if (loadingRole) return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08b51] mb-4"></div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    );
    if (role !== "admin") return <Navigate to="/" />;
    return <Products />;
  };

  const ProtectedCart = () => {
    if (!token) return <Navigate to="/login" />;
    if (loadingRole) return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08b51] mb-4"></div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    );
    if (role !== "reseller") return <Navigate to="/" />;
    return <Cart />;
  };

  const ProtectedAdminCart = () => {
    if (!token) return <Navigate to="/login" />;
    if (loadingRole) return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08b51] mb-4"></div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    );
    if (role !== "admin") return <Navigate to="/" />;
    return <AdminCart />;
  };

  const ProtectedResupplyOrders = () => {
    if (!token) return <Navigate to="/login" />;
    if (loadingRole) return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08b51] mb-4"></div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    );
    if (role !== "admin") return <Navigate to="/" />;
    return <ResupplyOrders />;
  };

  const ProtectedOrders = () => {
    if (!token) return <Navigate to="/login" />;
    if (loadingRole) return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08b51] mb-4"></div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    );
    if (role !== "reseller") return <Navigate to="/" />;
    return <Orders />;
  };

  // Hide navbar on login and signup pages
  const hideNavbar = location.pathname === "/login" || location.pathname === "/signup";

  return (
    <>
      {!hideNavbar && <Navbar role={role} loadingRole={loadingRole} />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedDashboard />} />
        <Route path="/suppliers" element={<ProtectedSupplierDashboard />} />
        <Route path="/ingredients" element={<ProtectedIngredients />} />
        <Route path="/products" element={<ProtectedProducts />} />
        <Route path="/cart" element={<ProtectedCart />} />
        <Route path="/admin-cart" element={<ProtectedAdminCart />} />
        <Route path="/resupply-orders" element={<ProtectedResupplyOrders />} /> {/* Add this line */}
        <Route path="/orders" element={<ProtectedOrders />} />
        <Route path="/orders/:id" element={<ProtectedOrders />} />
        <Route path="/users/:id" element={<UserProfile />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="*" element={<div>404 Not Found</div>} />
        
        
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <CartProvider>
      <Router>
        <AppContent />
      </Router>
    </CartProvider>
  );
}