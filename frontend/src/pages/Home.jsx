"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import "../styles/Home.css";
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
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../utils/auth";
import ScrollingTitle from "../components/ScrollingTitle";
import { useCart } from "../contexts/CartContext";
import ToastNotification from "../components/ToastNotification";
import AOS from "aos";
import "aos/dist/aos.css";
import { refreshToken } from "../utils/auth";
import { useLocation } from "react-router-dom";

const Home = () => {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    AOS.init({ once: true, duration: 1000, offset: 120 });
    setIsVisible(true);

    const disableTimer = setTimeout(() => {
      const elements = document.querySelectorAll("[data-aos]");
      elements.forEach((el) => {
        el.removeAttribute("data-aos");
      });
      if (AOS.refresh) {
        AOS.refresh();
      }
    }, 2500);

    return () => {
      clearTimeout(disableTimer);
    };
  }, []);

  const colors = {
    primary: "#f08b51",
    secondary: "#bb6653",
    white: "#ffffff",
    cream: "#f6d5bf",
    dark: "#1a1a1a",
  };

  const Button = (props) => <button type="button" {...props} />;
  const Badge = (props) => <span {...props} />;
  const Card = (props) => <div {...props} />;
  const CardContent = (props) => <div {...props} />;

  const [role, setRole] = useState(null);
  const navigate = useNavigate();

  const { addToCart } = useCart();

  useEffect(() => {
    async function checkAuth() {
      const access = localStorage.getItem("access");
      const refresh = localStorage.getItem("refresh");
      let token = access;
      if (!token && refresh) {
        token = await refreshToken();
      }
      if (!token) {
        setRole(null);
        return;
      }
      fetchWithAuth(`${import.meta.env.VITE_ACCOUNTS_URL}/users/me/`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          console.log("User data:", data);
          if (data && data.role) setRole(data.role);
          else setRole(null);
        })
        .catch(() => setRole(null));
    }

    checkAuth();
  }, [location]);

  useEffect(() => {
    if (role === "reseller" && window.location.pathname === "/dashboard") {
      navigate("/");
    }
  }, [role, navigate]);

  const isLoggedIn = !!localStorage.getItem("access");

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleAddToCart = useCallback(
    async (product) => {
      try {
        await addToCart(product);
        setToastMessage(`${product.name} has been added to cart`);
        setShowToast(true);
      } catch (error) {
        setToastMessage("Failed to add item to cart. Please try again.");
        setShowToast(true);
      }
    },
    [addToCart]
  );

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await fetchWithAuth(
          `${import.meta.env.VITE_INVENTORY_URL}/products/`
        );
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = await res.json();
        if (!isMounted) return;
        const active = Array.isArray(data)
          ? data.filter(
              (p) => p && (p.status === "Active" || p.status === "active")
            )
          : [];
        setProducts(active);
      } catch {
        if (isMounted) setProducts([]);
      } finally {
        if (isMounted) setLoadingProducts(false);
      }
    };
    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const memoizedProducts = useMemo(() => products, [products]);

  // --- Order Summary State ---
  const [orderSummary, setOrderSummary] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    // Only fetch summary for admin/superadmin
    if (role === "admin" || role === "superadmin") {
      const fetchSummary = async () => {
        setLoadingSummary(true);
        const today = new Date().toISOString().slice(0, 10);
        try {
          const res = await fetchWithAuth(
            `${import.meta.env.VITE_INVENTORY_URL}/orders/summary/?date=${today}`
          );
          if (!res.ok) throw new Error("Failed to fetch summary");
          const data = await res.json();
          setOrderSummary(data);
        } catch {
          setOrderSummary([]);
        } finally {
          setLoadingSummary(false);
        }
      };
      fetchSummary();
    }
  }, [role]);

  // --- Contact Form State and Handlers ---
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [sendingMessage, setSendingMessage] = useState(false);

  const handleContactChange = (e) => {
    setContactForm({ ...contactForm, [e.target.id]: e.target.value });
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSendingMessage(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_INVENTORY_URL}/contact-message/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contactForm),
        }
      );
      if (res.ok) {
        setToastMessage("Message sent successfully!");
        setShowToast(true);
        setContactForm({ name: "", email: "", subject: "", message: "" });
      } else {
        const data = await res.json();
        setToastMessage(data.detail || "Failed to send message.");
        setShowToast(true);
      }
    } catch {
      setToastMessage("Failed to send message.");
      setShowToast(true);
    }
    setSendingMessage(false);
  };

  return (
    <div className="min-h-screen bg-white-custom">
      {/* Hero Section */}
      <section
        id="home"
        className="pt-16 min-h-screen flex items-center gradient-white-cream"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div
              className={`space-y-8 transition-all duration-1000 ${
                isVisible
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-10"
              }`}
            >
              <div className="space-y-4">
                {/* Show tag only for reseller */}
                {role !== "admin" && role !== "superadmin" && (
                  <div className="product-card-title-badge text-sm py-1 badge-cream-secondary badge-wide">
                    Authentic Asian Noodles
                  </div>
                )}
                <h1
                  className={`${
                    role === "admin" || role === "superadmin"
                      ? "text-6xl lg:text-8xl"
                      : "text-5xl lg:text-7xl"
                  } leading-tight text-dark-custom buda-fs`}
                >
                  Jebran <span className="text-primary-custom">Miki</span>
                </h1>
                {!(role === "admin" || role === "superadmin") && (
                  <p className="text-xl leading-relaxed max-w-lg text-secondary-custom">
                    Where comfort meets flavor in every bowl. We deliver
                    delicious, machine-crafted noodles made with fresh ingredients and
                    bold, unforgettable taste.
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                {role === "admin" || role === "superadmin" ? (
                  <Button
                    size="lg"
                    className="px-8 py-3 text-lg hover:opacity-90 bg-primary-custom text-white-custom CTA-width"
                    onClick={() => navigate("/production")}
                  >
                    View Today's Production Batch
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="px-8 py-3 text-lg hover:opacity-90 bg-primary-custom text-white-custom CTA-width"
                    onClick={() => {
                      const productsSection = document.getElementById("products");
                      if (productsSection) {
                        productsSection.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                  >
                    Explore Our Products
                  </Button>
                )}
              </div>
              <div className="flex items-center space-x-6 pt-4"></div>
            </div>
            <div
              className={`relative transition-all duration-1000 delay-300 ${
                isVisible
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-10"
              }`}
            >
              <div className="relative">
                <img
                  src="/delicious-noodle-bowl-with-colorful-ingredients.jpg"
                  alt="Delicious noodle bowl"
                  className="w-full h-[600px] object-cover rounded-3xl shadow-2xl"
                  data-aos="fade-left"
                />
                <div
                  className="absolute -bottom-6 -left-6 rounded-2xl p-6 shadow-lg border bg-white-custom border-cream-custom"
                  data-aos="fade-up"
                >
                  <div
                    className="flex items-center space-x-3"
                    data-aos="fade-up"
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary-custom">
                      <ChefHat className="h-6 w-6 text-white-custom" />
                    </div>
                    <div>
                      <p className="font-semibold text-dark-custom">
                        15+ Years
                      </p>
                      <p className="text-sm text-secondary-custom">
                        Experience
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Menu or Daily Order Summary Section */}
      {(role !== "admin" && role !== "superadmin") ? (
        <section id="products" className="py-20 bg-cream-50">
          <ScrollingTitle text="Specialties" repetitions={2000} />
          <div
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
            data-aos="fade-up"
            data-aos-once="true"
          >
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-heavy mb-6 text-dark-custom mt-8">
                Signature <span className="text-primary-custom">Noodles</span>
              </h2>
              <p className="text-xl max-w-3xl mx-auto text-secondary-custom">
                Each noodle is crafted with passion, using traditional recipes and
                the freshest ingredients
              </p>
            </div>

            <div className="flex flex-col gap-8 items-center">
              {loadingProducts && (
                <div className="w-full text-center text-secondary-custom">
                  Loading products...
                </div>
              )}
              {!loadingProducts && memoizedProducts.length === 0 && (
                <div className="w-full text-center text-secondary-custom">
                  No active products available.
                </div>
              )}
              {!loadingProducts &&
                memoizedProducts.map((product, index) => {
                  const imageSrc = product.image
                    ? product.image.startsWith("http")
                      ? product.image
                      : `${import.meta.env.VITE_INVENTORY_URL}${product.image}`
                    : "/delicious-noodle-bowl-with-colorful-ingredients.jpg";
                  const priceText =
                    product.price !== null &&
                    product.price !== undefined &&
                    `${Number(product.price)}` !== "NaN"
                      ? `₱${Number(product.price).toFixed(2)}`
                      : "—";
                  return (
                    <Card
                      key={product.id}
                      className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border card-surface-white border-cream-custom menu-card flex flex-col md:flex-row overflow-hidden items-stretch"
                    >
                      <div className="relative overflow-hidden md:w-1/2">
                        <img
                          src={imageSrc}
                          alt={`${product.name} Image`}
                          className="w-full menu-image group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.src =
                              "/delicious-noodle-bowl-with-colorful-ingredients.jpg";
                          }}
                        />
                      </div>
                      <CardContent className="p-6 md:w-1/2">
                        <h3 className="text-5xl font-heavy mb-4 mt-2 text-dark-custom buda-fs-mini">
                          {product.name}
                        </h3>
                        <p className="mb-4 leading-relaxed text-secondary-custom">
                          {product.description ||
                            "Delicious noodles prepared fresh daily."}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-heavy text-price-primary">
                            {priceText}
                          </span>
                          {/* Only show Order Now button for resellers */}
                          {role === "reseller" && (
                            <Button
                              className="hover:opacity-90 bg-primary-custom text-white-custom badge-simple"
                              onClick={() => {
                                if (!isLoggedIn) {
                                  navigate("/login");
                                  return;
                                }
                                handleAddToCart(product);
                              }}
                              title={!isLoggedIn ? "Login to place an order" : undefined}
                            >
                              Order Now
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        </section>
      ) : (
        <section id="order-summary" className="py-20 bg-cream-50">
          <ScrollingTitle text="Daily Order Summary" repetitions={2000} />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8" data-aos="fade-up">
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-heavy mb-6 text-dark-custom mt-8">
                Today's <span className="text-primary-custom">Order Summary</span>
              </h2>
              <p className="text-xl max-w-3xl mx-auto text-secondary-custom">
                Number of orders placed for each active product today.
              </p>
            </div>
            <div className="flex flex-col gap-8 items-center">
              {loadingSummary && (
                <div className="w-full text-center text-secondary-custom">
                  Loading summary...
                </div>
              )}
              {!loadingSummary && orderSummary.length === 0 && (
                <div className="w-full text-center text-secondary-custom">
                  No orders placed today.
                </div>
              )}
              {!loadingSummary &&
                orderSummary.map((item, idx) => (
                  <Card
                    key={item.product_id}
                    className="group hover:shadow-xl transition-all duration-300 border card-surface-white border-cream-custom menu-card flex flex-col md:flex-row overflow-hidden items-stretch"
                  >
                    <div className="relative overflow-hidden md:w-1/2">
                      <img
                        src={
                          item.image
                            ? item.image.startsWith("http")
                              ? item.image
                              : `${import.meta.env.VITE_INVENTORY_URL}${item.image}`
                            : "/delicious-noodle-bowl-with-colorful-ingredients.jpg"
                        }
                        alt={`${item.product_name} Image`}
                        className="w-full menu-image group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src =
                            "/delicious-noodle-bowl-with-colorful-ingredients.jpg";
                        }}
                      />
                    </div>
                    <CardContent className="p-6 md:w-1/2">
                      <h3 className="text-5xl font-heavy mb-4 mt-2 text-dark-custom buda-fs-mini">
                        {item.product_name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-heavy text-price-primary">
                          ₱{Number(item.price).toFixed(2)}
                        </span>
                        <span className="text-lg font-semibold text-secondary-custom">
                          Orders: {item.total_orders}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* About Section */}
      {!(role === "admin" || role === "superadmin") && (
        <section id="about" className="py-20 bg-white-custom" data-aos="fade-up">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-heavy mb-6 text-dark-custom">
                Crafting{" "}
                <span className="text-primary-custom buda-fs-mini">
                  Authentic
                </span>{" "}
                Noodles
              </h2>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="text-center">
                <div className="text-4xl lg:text-5xl font-bold mb-2 text-primary-custom">
                  15+
                </div>
                <div className="text-lg text-secondary-custom">
                  Years Experience
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl lg:text-5xl font-bold mb-2 text-primary-custom">
                  50+
                </div>
                <div className="text-lg text-secondary-custom">
                  Trusted Resellers
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl lg:text-5xl font-bold mb-2 text-primary-custom">
                  100%
                </div>
                <div className="text-lg text-secondary-custom">Fresh Daily</div>
              </div>
            </div>
            {/* Values */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center space-y-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ backgroundColor: `${colors.primary}20` }}
                >
                  <ChefHat
                    className="h-8 w-8"
                    style={{ color: colors.primary }}
                  />
                </div>
                <h3 className="text-xl font-semibold text-dark-custom">
                  Authentic Recipes
                </h3>
                <p className="text-secondary-custom">
                  Traditional slow-simmered broths and time-tested recipes passed
                  down through generations
                </p>
              </div>
              <div className="text-center space-y-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ backgroundColor: `${colors.primary}20` }}
                >
                  <Leaf className="h-8 w-8" style={{ color: colors.primary }} />
                </div>
                <h3 className="text-xl font-semibold text-dark-custom">
                  Fresh Daily
                </h3>
                <p className="text-secondary-custom">
                  Premium ingredients sourced locally and fresh noodles made daily
                  in our kitchen
                </p>
              </div>
              <div className="text-center space-y-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ backgroundColor: `${colors.primary}20` }}
                >
                  <Zap className="h-8 w-8" style={{ color: colors.primary }} />
                </div>
                <h3 className="text-xl font-semibold text-dark-custom">
                  Quick Service
                </h3>
                <p className="text-secondary-custom">
                  Fast, friendly service without compromising on quality or the
                  care we put into every bowl
                </p>
              </div>
              <div className="text-center space-y-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ backgroundColor: `${colors.primary}20` }}
                >
                  <Heart className="h-8 w-8" style={{ color: colors.primary }} />
                </div>
                <h3 className="text-xl font-semibold text-dark-custom">
                  Made with Love
                </h3>
                <p className="text-secondary-custom">
                  Every bowl is crafted with passion, care, and dedication to
                  bringing you comfort and joy
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      {!(role === "admin" || role === "superadmin") && (
        <section id="contact" className="py-20 bg-cream-50 flex items-center justify-center min-h-[60vh]">
          <div
            className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center"
            data-aos="fade-up"
          >
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-heavy mb-6 text-dark-custom">
                Visit <span className="text-primary-custom">Us</span>
              </h2>
              <p className="text-xl max-w-3xl mx-auto text-secondary-custom">
                Have questions about our noodles or want to place a special order?
                We'd love to hear from you!
              </p>
            </div>

            <div className="flex flex-col gap-8 items-center w-full">
              {/* Contact Information */}
              <div className="space-y-8 w-full flex flex-col items-center">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary-custom mb-2">
                    <MapPin className="h-6 w-6 text-white-custom" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-dark-custom text-center">
                    Visit Our Restaurant
                  </h3>
                  <p className="text-secondary-custom text-center">
                    Plaridel Street, Brgy. Poblacion
                    <br />
                    Kidapawan City, Cotabato
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary-custom mb-2">
                    <Phone className="h-6 w-6 text-white-custom" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-dark-custom text-center">
                    Call Us
                  </h3>
                  <p className="text-secondary-custom text-center">0919-221-2555 Mary Josie Buenviaje (Manager)</p>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary-custom mb-2">
                    <Mail className="h-6 w-6 text-white-custom" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-dark-custom text-center">
                    Email Us
                  </h3>
                  <p className="text-secondary-custom text-center">jebranmikifactory@gmail.com</p>
                  <p className="text-sm text-secondary-custom text-center">
                    We'll respond within 24 hours
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <footer className="py-12 bg-dark-custom text-white-custom">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Column 1: Brand & Description */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <ChefHat className="h-8 w-8" style={{ color: colors.primary }} />
                <span className="text-2xl font-bold">Jebran Miki</span>
              </div>
              <p className="text-white-cc">
                Bringing you the finest noodles with authentic flavors and fresh ingredients.
              </p>
            </div>
            {/* Column 2: Quick Links (first 5 admin links) */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {role === "admin" || role === "superadmin" ? (
                  <>
                    <li>
                      <button
                        onClick={() => navigate("/")}
                        className="transition-colors hover:opacity-80 text-white-cc"
                      >
                        Home
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => navigate("/production")}
                        className="transition-colors hover:opacity-80 text-white-cc"
                      >
                        Production Batch
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => navigate("/admin-orders")}
                        className="transition-colors hover:opacity-80 text-white-cc"
                      >
                        Admin Orders
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => navigate("/sales-management")}
                        className="transition-colors hover:opacity-80 text-white-cc"
                      >
                        Sales Management
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => navigate("/resupply-orders")}
                        className="transition-colors hover:opacity-80 text-white-cc"
                      >
                        Resupply Orders
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <button
                        onClick={() => {
                          const section = document.getElementById("home");
                          if (section) section.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="transition-colors hover:opacity-80 text-white-cc"
                      >
                        Home
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          const section = document.getElementById("products");
                          if (section) section.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="transition-colors hover:opacity-80 text-white-cc"
                      >
                        Products
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          const section = document.getElementById("about");
                          if (section) section.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="transition-colors hover:opacity-80 text-white-cc"
                      >
                        About
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          const section = document.getElementById("contact");
                          if (section) section.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="transition-colors hover:opacity-80 text-white-cc"
                      >
                        Contact
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </div>
            {/* Column 3: More Admin Links (next 4 admin links) */}
            <div>
              <h4 className="text-lg font-semibold mb-4">
                {role === "admin" || role === "superadmin" ? "Management" : "Explore"}
              </h4>
              <ul className="space-y-2">
                {role === "admin" || role === "superadmin" ? (
                  <>
                    <li>
                      <button
                        onClick={() => navigate("/products")}
                        className="transition-colors hover:opacity-80 text-white-cc"
                      >
                        Products
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => navigate("/ingredients")}
                        className="transition-colors hover:opacity-80 text-white-cc"
                      >
                        Ingredients
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => navigate("/suppliers")}
                        className="transition-colors hover:opacity-80 text-white-cc"
                      >
                        Suppliers
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => navigate("/dashboard")}
                        className="transition-colors hover:opacity-80 text-white-cc"
                      >
                        Users
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <button
                        onClick={() => navigate("/orders")}
                        className="transition-colors hover:opacity-80 text-white-cc"
                      >
                        Orders
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </div>
            {/* Column 4: Contact Info */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
              <ul className="space-y-2 text-white-cc">
                <li>Email: jebranmikifactory@gmail.com</li>
                <li>Phone: 0919-221-2555 Mary Josie Buenviaje (Manager)</li>
                <li>Plaridel Street, Brgy. Poblacion, Kidapawan City, Cotabato</li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center border-white-33">
            <p className="text-white-99">
              &copy; 2025 Jebran Miki. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      <ToastNotification
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={3000}
      />
    </div>
  );
};

export default Home;