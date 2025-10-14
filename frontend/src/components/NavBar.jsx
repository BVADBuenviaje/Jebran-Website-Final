import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/Logo.svg";
import StickyHeadroom from "@integreat-app/react-sticky-headroom";
import UserIcon from "../assets/user1.png";
import ShoppingCartIcon from "../assets/cart.svg";
import ResellerCartModal from "./ResellerCartModal";
import AdminCartModal from "./AdminCartModal";
import "./NavBar.css";

export default function Navbar({ role, loadingRole }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("access"));
  const [showCartModal, setShowCartModal] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem("access"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handlePageNavigation = (path) => {
    navigate(path);
  };

  const handleSectionScroll = (sectionId) => {
    const currentPath = location.pathname;
    if (currentPath === "/") {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Admin links
  const adminLinks = [
    { label: "Home", path: "/" },
    { label: "Users", path: "/dashboard" },
    { label: "Products", path: "/products" },
    { label: "Ingredients", path: "/ingredients" },
    { label: "Suppliers", path: "/suppliers" },
    { label: "Resupply Orders", path: "/resupply-orders" }, // Add this line
  ];

  // Regular user links
  const userLinks = [
    { label: "Home", path: "/" },
    { label: "Products", path: "/#products" },
    { label: "About", path: "/#about" },
    { label: "Contact", path: "/#contact" },
  ];

  const linksToShow = role === "admin" ? adminLinks : userLinks;

  // Show nothing or a spinner while loading role
  if (loadingRole) {
    return (
      <div className="flex justify-center items-center h-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f08b51]" />
      </div>
    );
  }

  return (
    <>
      <StickyHeadroom scrollHeight={500} pinStart={10}>
        <nav className="navbar" style={{ minWidth: "1100px" }}>
          <ul className="navbar-list" style={{ minWidth: "1100px" }}>
            <li className="navbar-logo">
              <img src={logo} alt="logo" />
            </li>
            <div className="navbar-links">
              {linksToShow.map(link => (
                <li
                  key={link.label}
                  className={`navbar-link ${isActive(link.path) ? 'active' : ''}`}
                  onClick={() => {
                    if (link.path === "/" || link.path === "/home") {
                      handleSectionScroll("home");
                    } else if (link.path.startsWith("/#")) {
                      handleSectionScroll(link.path.replace("/#", ""));
                    } else {
                      handlePageNavigation(link.path);
                    }
                  }}
                >
                  {link.label}
                </li>
              ))}
            </div>
            {token && (
              <li className="navbar-cart">
                <img 
                  src={ShoppingCartIcon} 
                  alt="cart" 
                  onClick={() => setShowCartModal(true)}
                  style={{ cursor: 'pointer' }}
                />
              </li>
            )}
            <li className="navbar-user">
              <img
                src={UserIcon}
                alt="user"
                onClick={() => setShowDropdown((prev) => !prev)}
              />
              {showDropdown && (
                <div ref={dropdownRef} className="navbar-dropdown">
                  {token ? (
                    <button
                      className="navbar-dropdown-btn"
                      onClick={() => {
                        localStorage.removeItem("access");
                        localStorage.removeItem("refresh");
                        localStorage.removeItem("username");
                        setToken(null);
                        setShowDropdown(false);
                        navigate("/");
                      }}
                    >
                      Sign out
                    </button>
                  ) : (
                    <>
                      <button
                        className="navbar-dropdown-btn"
                        onClick={() => navigate('/login')}
                      >
                        Login
                      </button>
                      <button
                        className="navbar-dropdown-btn"
                        onClick={() => navigate('/signup')}
                      >
                        Signup
                      </button>
                    </>
                  )}
                </div>
              )}
            </li>
          </ul>
        </nav>
      </StickyHeadroom>
      {showCartModal && (
        role === "reseller" ? (
          <ResellerCartModal onClose={() => setShowCartModal(false)} />
        ) : role === "admin" ? (
          <AdminCartModal onClose={() => setShowCartModal(false)} />
        ) : null
      )}
    </>
  );
}