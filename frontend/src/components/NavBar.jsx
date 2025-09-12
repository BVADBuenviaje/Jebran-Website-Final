import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/Logo.svg";
import StickyHeadroom from "@integreat-app/react-sticky-headroom";
import UserIcon from "../assets/user1.png";
import ShoppingCartIcon from "../assets/cart.svg";

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
    if (currentPath === '/') {
      const element = document.getElementById(path.replace('/', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } 
    // If we're not on home page, navigate to home then scroll
    else {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(path.replace('/', ''));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
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
            <ul
              className={`cursor-pointer hover:opacity-80 font-jomhuria text-[28px] transition-opacity duration-200 ${
                isActive('/') ? 'opacity-100 font-bold' : 'opacity-90'
              }`}
              style={{ letterSpacing: "2px", marginTop: "4px" }}
              onClick={() => handleNavClick('/')}
            >
              Home
            </ul>
            <ul
              className={`cursor-pointer hover:opacity-80 font-jomhuria text-[28px] transition-opacity duration-200 ${
                isActive('/products') ? 'opacity-100 font-bold' : 'opacity-90'
              }`}
              style={{ letterSpacing: "2px", marginTop: "4px" }}
              onClick={() => handleNavClick('/products')}
            >
              Products
            </ul>
            <ul
              className={`cursor-pointer hover:opacity-80 font-jomhuria text-[28px] transition-opacity duration-200 ${
                isActive('/about') ? 'opacity-100 font-bold' : 'opacity-90'
              }`}
              style={{ letterSpacing: "2px", marginTop: "4px" }}
              onClick={() => handleNavClick('/about')}
            >
              About
            </ul>
            <ul
              className={`cursor-pointer hover:opacity-80 font-jomhuria text-[28px] transition-opacity duration-200 ${
                isActive('/contact') ? 'opacity-100 font-bold' : 'opacity-90'
              }`}
              style={{ letterSpacing: "2px", marginTop: "4px" }}
              onClick={() => handleNavClick('/contact')}
            >
              Contact
            </ul>
            <ul
              className={`cursor-pointer hover:opacity-80 font-jomhuria text-[28px] transition-opacity duration-200 ${
                isActive('/orders') ? 'opacity-100 font-bold' : 'opacity-90'
              }`}
              style={{ letterSpacing: "2px", marginTop: "4px" }}
              onClick={() => handleNavClick('/orders')}
            >
              Orders
            </ul>
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
              className="w-6 h-6 cursor-pointer"
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
                <button
                  className="block w-full px-4 py-2 text-left hover:bg-[#F08B51] transition-colors duration-200"
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
                  className="block w-full px-4 py-2 text-left hover:bg-[#F08B51] transition-colors duration-200"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onClick={() => navigate('/signup')}
                >
                  Signup
                </button>
              </div>
            )}
          </ul>
        </ul>
      </nav>
    </StickyHeadroom>
  );
}
