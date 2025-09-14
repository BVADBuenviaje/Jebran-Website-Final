import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/Logo.svg";
import StickyHeadroom from "@integreat-app/react-sticky-headroom";
import UserIcon from "../assets/user1.png";
import ShoppingCartIcon from "../assets/cart.svg";
import "./NavBar.css";

export default function Navbar({ role }) {
  console.log("NavBar - Current role:", role); // Add this line for debugging
  const [showDropdown, setShowDropdown] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("access"));
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

  // Listen for changes to localStorage (e.g. login/logout from other tabs)
  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem("access"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Add these separate handlers
  const handlePageNavigation = (path) => {
    console.log("Navigating to page:", path);
    navigate(path);
  };

  const handleSectionScroll = (sectionId) => {
    console.log("Scrolling to section:", sectionId);
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
  ];

  // Regular user links
  const userLinks = [
    { label: "Home", path: "/" },
    { label: "Products", path: "/products" },
    { label: "About", path: "/about" },
    { label: "Contact", path: "/contact" },
  ];

  const linksToShow = role === "admin" ? adminLinks : userLinks;

  return (
    <StickyHeadroom scrollHeight={500} pinStart={10}>
      <nav className="navbar">
        <ul className="navbar-list">
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
          <li className="navbar-cart">
            <img 
              src={ShoppingCartIcon} 
              alt="cart" 
              onClick={() => navigate('/orders')}
              style={{ cursor: 'pointer' }}
            />
          </li>

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
                      setToken(null);
                      window.location.reload();
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
  );
}