import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/Logo.svg";
import StickyHeadroom from "@integreat-app/react-sticky-headroom";
import UserIcon from "../assets/user1.png";
import ShoppingCartIcon from "../assets/cart.svg";
import { useCart } from "../contexts/CartContext";
import "./NavBar.css";
import AdminCartModal from "./AdminCartModal";

export default function Navbar({ role, loadingRole }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAdminCartModal, setShowAdminCartModal] = useState(false);
  const [localToken, setLocalToken] = useState(localStorage.getItem("access")); // renamed to avoid conflict
  const dropdownRef = useRef(null);
  const inventoryDropdownRef = useRef(null);
  const [showInventoryDropdown, setShowInventoryDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { getCartItemCount, clearCart, setToken } = useCart();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (inventoryDropdownRef.current && !inventoryDropdownRef.current.contains(event.target)) {
        setShowInventoryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setLocalToken(localStorage.getItem("access"));
      setToken(localStorage.getItem("access")); // update context token
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [setToken]);

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

  // Admin links (with Inventory dropdown)
  const adminLinks = [
    { label: "Home", path: "/" },
    { label: "Users", path: "/dashboard" },
    { label: "Products", path: "/products" },
   
    { label: "Admin Orders", path: "/admin-orders" },
    {
      label: "Inventory",
      type: "dropdown",
      items: [
        { label: "Ingredients", path: "/ingredients" },
        { label: "Suppliers", path: "/suppliers" },
        { label: "Resupply Orders", path: "/resupply-orders" },
      ],
    },
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
              {linksToShow.map(link => {
                if (link.type === "dropdown") {
                  return (
                    <li key={link.label} className={`navbar-link ${showInventoryDropdown ? 'active' : ''}`} ref={inventoryDropdownRef} onClick={() => setShowInventoryDropdown(prev => !prev)} style={{ position: 'relative' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {link.label}
                        <span className={`chevron ${showInventoryDropdown ? 'open' : ''}`} style={{ display: 'inline-block', transition: 'transform 150ms ease', transform: showInventoryDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          ▾
                        </span>
                      </span>
                      {showInventoryDropdown && (
                        <div className="navbar-dropdown navbar-dropdown-left" style={{ minWidth: 180 }}>
                          {link.items.map(item => (
                            <button
                              key={item.label}
                              className="navbar-dropdown-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowInventoryDropdown(false);
                                handlePageNavigation(item.path);
                              }}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                }
                return (
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
                );
              })}
            </div>
            {localToken && role === "admin" && (
              <li className="navbar-cart">
                <div
                  className="cart-icon-container"
                  onClick={() => setShowAdminCartModal(true)}
                >
                  <img
                    src={ShoppingCartIcon}
                    alt="cart"
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              </li>
            )}
            {localToken && role === "reseller" && (
              <li className="navbar-cart">
                <div
                  className="cart-icon-container"
                  onClick={() => navigate('/cart')}
                >
                  <img
                    src={ShoppingCartIcon}
                    alt="cart"
                    style={{ cursor: 'pointer' }}
                  />
                  {getCartItemCount() > 0 && (
                    <span className="cart-item-count">
                      {getCartItemCount()}
                    </span>
                  )}
                </div>
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
                  {localToken ? (
                    <>
                      <button
                        className="navbar-dropdown-btn"
                        onClick={() => {
                          setShowDropdown(false);
                          // Get user ID from localStorage (make sure you store it after login)
                          const userId = localStorage.getItem("user.id");
                          if (userId) {
                            navigate(`/users/${userId}`);
                          }
                        }}
                      >
                        Profile
                      </button>
                      <button
                        className="navbar-dropdown-btn"
                        onClick={() => {
                          localStorage.removeItem("access");
                          localStorage.removeItem("refresh");
                          localStorage.removeItem("username");
                        clearCart();
                        setLocalToken(null); // update local state
                          localStorage.removeItem("user.id");
                          setToken(null); // update context token
                          setShowDropdown(false);
                          navigate("/");
                        }}
                      >
                        Sign out
                      </button>
                    </>
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
      {showAdminCartModal && (
        <AdminCartModal onClose={() => setShowAdminCartModal(false)} />
      )}
    </>
  );
}