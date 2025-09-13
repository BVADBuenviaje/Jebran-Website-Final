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

  // Handle navigation clicks - scroll if on home page, navigate otherwise
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

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Admin links
  const adminLinks = [
    { label: "Home", path: "/" },
    { label: "Users", path: "/dashboard" },
    { label: "Products", path: "/admin-products" },
    { label: "Ingredients", path: "/ingredients" },
    { label: "Suppliers", path: "/suppliers" },
  ];

  // Regular user links
  const userLinks = [
    { label: "Home", path: "/" },
    { label: "Products", path: "/products" },
    { label: "About", path: "/about" },
    { label: "Contact", path: "/contact" },
    { label: "Orders", path: "/orders" },
  ];

  const linksToShow = role === "admin" ? adminLinks : userLinks;

  return (
    <StickyHeadroom scrollHeight={500} pinStart={10}>
      <nav
        className="fixed top-[30px] left-1/2 -translate-x-1/2 
        w-[70%] max-w-5xl rounded-[100px] border border-[#F08B51] 
        bg-[#F08B51] px-6 py-1 shadow-lg transition-transform duration-300"
        style={{ width: "100%" }}
      >
        <ul className="flex items-center justify-center gap-x-16 text-[#FFFBE8]">
          <ul className="cursor-pointer hover:opacity-80">
            <img src={logo} alt="logo" className="w-12 h-12" />
          </ul>
          <div className="flex items-center justify-center gap-x-16 text-[#FFFBE8]">
            {linksToShow.map(link => (
              <ul
                key={link.label}
                className={`cursor-pointer hover:opacity-80 font-jomhuria text-[28px] transition-opacity duration-200 ${
                  isActive(link.path) ? 'opacity-100 font-bold' : 'opacity-90'
                }`}
                style={{ letterSpacing: "2px", marginTop: "4px" }}
                onClick={() => handleNavClick(link.path)}
              >
                {link.label}
              </ul>
            ))}
          </div>
          <ul className="cursor-pointer hover:opacity-80 font-jomhuria text-[24px]">
            <img
              src={ShoppingCartIcon}
              alt="cart"
              className="w-[30px] h-[30px]"
            />
          </ul>
          <ul className="relative">
            <img
              src={UserIcon}
              alt="user"
              onClick={() => setShowDropdown((prev) => !prev)}
            />
            {showDropdown && (
              <div
                ref={dropdownRef}
                className="absolute right-0 mt-2 w-40 shadow-lg z-50"
                style={{
                  background: "#FFFBE8",
                  border: "2px solid #F08B51",
                  color: "#BB6653",
                  fontFamily: "Buda, serif",
                  fontSize: "1.3rem",
                  fontWeight: "lighter",
                  letterSpacing: "1px",
                  padding: "0.5rem 0",
                }}
              >
                {token ? (
                  <button
                    className="block w-full px-4 py-2 text-left hover:bg-[#F08B51] hover:text-white transition-colors duration-200"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
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
                      className="block w-full px-4 py-2 text-left hover:bg-[#F08B51] hover:text-white transition-colors duration-200"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onClick={() => navigate('/login')}
                    >
                      Login
                    </button>
                    <button
                      className="block w-full px-4 py-2 text-left hover:bg-[#F08B51] hover:text-white transition-colors duration-200"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onClick={() => navigate('/signup')}
                    >
                      Signup
                    </button>
                  </>
                  //#TODO: Add signup button
                )}
              </div>
            )}
          </ul>
        </ul>
      </nav>
    </StickyHeadroom>
  );
}