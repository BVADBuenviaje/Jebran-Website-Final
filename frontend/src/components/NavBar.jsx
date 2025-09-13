import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/Logo.svg";
import StickyHeadroom from "@integreat-app/react-sticky-headroom";
import UserIcon from "../assets/user1.png";
import ShoppingCartIcon from "../assets/cart.svg";
import "./NavBar.css";

export default function Navbar({ role }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("access"));
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listen for changes to localStorage (e.g. login/logout from other tabs)
  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem("access"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Handle navigation clicks (original behavior)
  const handleNavClick = (path) => {
    const currentPath = location.pathname;
    if (currentPath === "/") {
      const element = document.getElementById(path.replace("/", ""));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById(path.replace("/", ""));
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  };

  // Check if current path is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Admin links (from NEW)
  const adminLinks = [
    { label: "Home", path: "/home" },
    { label: "Users", path: "/dashboard" },
    { label: "Products", path: "/admin-products" },
    { label: "Ingredients", path: "/ingredients" },
    { label: "Suppliers", path: "/suppliers" },
  ];

  // Regular user links (from NEW)
  const userLinks = [
    { label: "Home", path: "/home" },
    { label: "Products", path: "/products" },
    { label: "About", path: "/about" },
    { label: "Contact", path: "/contact" },
  ];

  const linksToShow = role === "admin" ? adminLinks : userLinks;

  return (
    <StickyHeadroom scrollHeight={500} pinStart={10}>
      <nav className="navbar">
        <ul className="navbar-list">
          <li
            className="navbar-logo"
            onClick={() => {
              if (location.pathname === "/") {
                const homeSection = document.getElementById("home");
                if (homeSection) {
                  homeSection.scrollIntoView({ behavior: "smooth" });
                }
              } else {
                navigate("/");
                setTimeout(() => {
                  const homeSection = document.getElementById("home");
                  if (homeSection) {
                    homeSection.scrollIntoView({ behavior: "smooth" });
                  }
                }, 100);
              }
            }}
          >
            <img src={logo} alt="logo" />
          </li>
          {linksToShow.map((link) => (
            <li
              key={link.label}
              className={`navbar-link${isActive(link.path) ? " active" : ""}`}
              onClick={() => handleNavClick(link.path)}
            >
              {link.label}
            </li>
          ))}
          <li className="navbar-cart">
            <img src={ShoppingCartIcon} alt="cart" />
          </li>
          <li className="navbar-user">
            <img
              src={UserIcon}
              alt="user"
              onClick={() => setShowDropdown((prev) => !prev)}
            />
            {showDropdown && (
              <div ref={dropdownRef} className="navbar-user-dropdown">
                {token ? (
                  <button
                    className="navbar-user-dropdown-btn"
                    onClick={() => {
                      localStorage.removeItem("access");
                      setToken(null);
                      window.location.reload();
                    }}
                  >
                    Sign out
                  </button>
                ) : (
                  <>
                    <button
                      className="navbar-user-dropdown-btn"
                      onClick={() => navigate("/login")}
                    >
                      Login
                    </button>
                    <button
                      className="navbar-user-dropdown-btn"
                      onClick={() => navigate("/signup")}
                    >
                      {/* sdfsdfs */}
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
  );
}
