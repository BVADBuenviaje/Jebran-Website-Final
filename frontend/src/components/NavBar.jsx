import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/JebranLogo.png";
import StickyHeadroom from "@integreat-app/react-sticky-headroom";
import UserIcon from "../assets/user1.png";
import ShoppingCartIcon from "../assets/cart.svg";
import { useCart } from "../contexts/CartContext";
import "./NavBar.css";
import AdminCartModal from "./AdminCartModal";
import { fetchWithAuth } from "../utils/auth";

import {
  ChefHat,
  Star,
  MapPin,
  Phone,
  Mail,
  Clock,
  Leaf,
  Zap,
  Heart,
} from "lucide-react";

export default function Navbar({ role, loadingRole }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRefs = useRef({});
  const userDropdownRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAdminCartModal, setShowAdminCartModal] = useState(false);
  const [localToken, setLocalToken] = useState(localStorage.getItem("access"));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dropdownRef = useRef(null);
  const inventoryDropdownRef = useRef(null);
  const [showInventoryDropdown, setShowInventoryDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Single useCart call
  const { cartItems, getCartItemCount, clearCart, setToken } = useCart();

  const [activeProductIds, setActiveProductIds] = useState([]);

  // Active cart items (mirror Cart.jsx logic)
  const activeCartItems =
    cartItems && cartItems.length > 0
      ? activeProductIds.length === 0
        ? cartItems // while active list is loading, show all
        : cartItems.filter((item) => {
            const productId = Number(
              item.product_id ?? item.product?.id ?? item.id
            );
            return activeProductIds.includes(productId);
          })
      : [];

  // Cart count = TOTAL QUANTITY of active items
  const cartCount = activeCartItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0
  );

  // Load active products (frontend filtering by status)
  useEffect(() => {
    const loadActiveProducts = async () => {
      try {
        const res = await fetchWithAuth(
          `${import.meta.env.VITE_INVENTORY_URL}/products/`
        );
        const data = await res.json();

        const activeIds = (Array.isArray(data) ? data : [])
          .filter((product) => product.status === "Active")
          .map((product) => product.id);

        setActiveProductIds(activeIds);
        console.log("Navbar activeProductIds:", activeIds);
      } catch (error) {
        console.error("Error fetching products in Navbar:", error);
        setActiveProductIds([]);
      }
    };

    loadActiveProducts();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
      if (
        openDropdown &&
        dropdownRefs.current[openDropdown] &&
        !dropdownRefs.current[openDropdown].contains(event.target)
      ) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  useEffect(() => {
    const handleStorageChange = () => {
      const access = localStorage.getItem("access");
      setLocalToken(access);
      setToken(access);
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [setToken]);

  // Validate token on mount
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      setIsAuthenticated(false);
      setLocalToken(null);
      return;
    }
    fetch(`${import.meta.env.VITE_ACCOUNTS_URL}/users/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) {
          setIsAuthenticated(true);
          setLocalToken(token);
        } else {
          setIsAuthenticated(false);
          setLocalToken(null);
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          localStorage.removeItem("user.id");
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
        setLocalToken(null);
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("user.id");
      });
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

  const isActive = (path) => location.pathname === path;

  const adminLinks = [
    { label: "Home", path: "/" },
    {
      label: "Operations",
      type: "dropdown",
      items: [
        { label: "Production", path: "/production" },
        { label: "Admin Orders", path: "/admin-orders" },
        { label: "Sales Management", path: "/sales-management" },
        { label: "Resupply Orders", path: "/resupply-orders" },
      ],
    },
    {
      label: "Inventory",
      type: "dropdown",
      items: [
        { label: "Products", path: "/products" },
        { label: "Ingredients", path: "/ingredients" },
        { label: "Suppliers", path: "/suppliers" },
      ],
    },
    { label: "Users", path: "/dashboard" },
  ];

  const userLinks = [
    { label: "Home", path: "/" },
    { label: "Products", path: "/#products" },
    { label: "Orders", path: "/orders" },
    { label: "About", path: "/#about" },
    { label: "Contact", path: "/#contact" },
  ];

  const linksToShow =
    role === "admin" || role === "superadmin" ? adminLinks : userLinks;

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
              {linksToShow.map((link) => {
                if (link.type === "dropdown") {
                  const isOpen = openDropdown === link.label;
                  return (
                    <li
                      key={link.label}
                      className={`navbar-link ${isOpen ? "active" : ""}`}
                      ref={(el) => {
                        if (el) {
                          dropdownRefs.current[link.label] = el;
                        } else {
                          delete dropdownRefs.current[link.label];
                        }
                      }}
                      onClick={() =>
                        setOpenDropdown(isOpen ? null : link.label)
                      }
                      style={{ position: "relative" }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        {link.label}
                        <span
                          className={`chevron ${isOpen ? "open" : ""}`}
                          style={{
                            display: "inline-block",
                            transition: "transform 150ms ease",
                            transform: isOpen
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                          }}
                        >
                          ▾
                        </span>
                      </span>
                      {isOpen && (
                        <div
                          className="navbar-dropdown navbar-dropdown-left"
                          style={{ minWidth: 200 }}
                        >
                          {link.items.map((item) => (
                            <button
                              key={item.label}
                              className="navbar-dropdown-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(null);
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
                    className={`navbar-link ${
                      isActive(link.path) ? "active" : ""
                    }`}
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

            {/* Admin cart icon (no badge) */}
            {isAuthenticated && (role === "admin" || role === "superadmin") && (
              <li className="navbar-cart">
                <div
                  className="cart-icon-container"
                  onClick={() => setShowAdminCartModal(true)}
                >
                  <img
                    src={ShoppingCartIcon}
                    alt="cart"
                    style={{ cursor: "pointer" }}
                  />
                </div>
              </li>
            )}

            {/* Reseller cart icon with ACTIVE quantity badge */}
            {isAuthenticated && role === "reseller" && (
              <li className="navbar-cart">
                <div
                  className="cart-icon-container"
                  onClick={() => navigate("/cart")}
                >
                  <img
                    src={ShoppingCartIcon}
                    alt="cart"
                    style={{ cursor: "pointer" }}
                  />
                  {cartCount > 0 && (
                    <span className="cart-item-count">{cartCount}</span>
                  )}
                </div>
              </li>
            )}

            <li className="navbar-user" ref={userDropdownRef}>
              <img
                src={UserIcon}
                alt="user"
                onClick={() => setShowDropdown((prev) => !prev)}
              />
              {showDropdown && (
                <div ref={dropdownRef} className="navbar-dropdown">
                  {isAuthenticated ? (
                    <>
                      <button
                        className="navbar-dropdown-btn"
                        onClick={() => {
                          setShowDropdown(false);
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
                          setLocalToken(null);
                          localStorage.removeItem("user.id");
                          setToken(null);
                          setIsAuthenticated(false);
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
                        onClick={() => navigate("/login")}
                      >
                        Login
                      </button>
                      <button
                        className="navbar-dropdown-btn"
                        onClick={() => navigate("/signup")}
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
