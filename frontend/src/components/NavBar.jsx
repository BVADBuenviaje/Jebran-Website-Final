import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/Logo.svg";
import StickyHeadroom from "@integreat-app/react-sticky-headroom";
import UserIcon from "../assets/user1.png";
import ShoppingCartIcon from "../assets/cart.svg";
import "./NavBar.css";

export default function Navbar() {
  const [showDropdown, setShowDropdown] = useState(false);
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

  // Handle navigation clicks
  const handleNavClick = (path) => {
    const currentPath = location.pathname;

    // If we're on home page, scroll to section
    if (currentPath === "/") {
      const element = document.getElementById(path.replace("/", ""));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
    // If we're not on home page, navigate to home then scroll
    else {
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
          <div className="navbar-links">

            <li
              className={`navbar-link${isActive("/home") ? " active" : ""}`}
              onClick={() => handleNavClick("/home")}
            >
              Home
            </li>
            <li
              className={`navbar-link${isActive("/products") ? " active" : ""}`}
              onClick={() => handleNavClick("/products")}
            >
              Products
            </li>
            <li
              className={`navbar-link${isActive("/about") ? " active" : ""}`}
              onClick={() => handleNavClick("/about")}
            >
              About
            </li>
            <li
              className={`navbar-link${isActive("/contact") ? " active" : ""}`}
              onClick={() => handleNavClick("/contact")}
            >
              Contact
            </li>
                      
          </div>
          <div className="outer-icons-right">
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
                  Signup
                </button>
              </div>
            )}
          </li>
          </div>

        </ul>
      </nav>
    </StickyHeadroom>
  );
}
