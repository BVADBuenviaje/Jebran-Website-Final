"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ScrollingTitle from "../components/ScrollingTitle";
import "../styles/Home.css";
import AOS from "aos";
import "aos/dist/aos.css";
// import { useEffect } from "react";

const Home = () => {
  const [role, setRole] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    AOS.init({ once: true, duration: 1000 });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      setRole(null);
      return;
    }
    fetch(`${import.meta.env.VITE_ACCOUNTS_URL}/users/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.role) setRole(data.role);
        else setRole(null);
      })
      .catch(() => setRole(null));
  }, []);

  useEffect(() => {
    if (role === "reseller" && window.location.pathname === "/dashboard") {
      navigate("/");
    }
  }, [role, navigate]);

  return (
    <div className="root">
      {/* <nav className="navbar">
        <ul className="navbar-list">
          <li className="navbar-logo">
            <img src={logo} alt="logo" />
          </li>
          <div className="navbar-links">
            <li className="navbar-link">Home</li>
            <li className="navbar-link">Products</li>
            <li className="navbar-link">Orders</li>
          </div>
          <li className="navbar-cart">
            <img src={ShoppingCartIcon} alt="cart" />
          </li>
          <li className="navbar-user" style={{ position: "relative" }}>
            <img
              src={UserIcon}
              alt="user"
              onClick={() => setShowDropdown((prev) => !prev)}
            />
            {showDropdown && (
              <div className="navbar-user-dropdown">
                <button
                  className="navbar-user-dropdown-btn"
                  onClick={() => (window.location.href = "/login")}
                >
                  Login
                </button>
                <button
                  className="navbar-user-dropdown-btn"
                  onClick={() => (window.location.href = "/signup")}
                >
                  Signup
                </button>
              </div>
            )}
          </li>
        </ul>
      </nav> */}

      <section id="home" data-aos="fade-up" data-aos-delay="100">
        <div className="hero-content">
          <div className="hero-text" data-aos="fade-up" data-aos-delay="200">
            <h1 className="hero-title" data-aos="fade-up" data-aos-delay="300">
              Jebran Miki
            </h1>
            <p
              className="hero-subtitle"
              data-aos="fade-up"
              data-aos-delay="400"
            >
              Welcome to Jebran - where comfort meets flavor in every bowl. We
              deliver delicious, handcrafted noodles made with fresh ingredients
              and bold, unforgettable taste. Come in, click in, slurp it.
            </p>
            <button
              className="btn-products"
              data-aos="fade-up"
              data-aos-delay="500"
              onClick={() => {
                const productsSection = document.getElementById("products");
                if (productsSection) {
                  productsSection.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              Products
            </button>
          </div>
          <div className="hero-image" data-aos="fade-up" data-aos-delay="600">
            <img
              src="/delicious-noodle-bowl-with-colorful-ingredients.jpg"
              alt="Delicious noodle bowl"
              className="noodle-image"
            />
          </div>
        </div>
      </section>

      <section
        id="products"
        className="products animate-fadeInUp animate-delay-2"
        data-aos="fade-up" data-aos-delay="100"
      >
        <hr className="hr1" />
        <ScrollingTitle text="Jebran" repetitions={2000} />
        <hr className="hr2" />
        <div className="products-container">
          <h2 className="products-title">Products</h2>
          <div className="products-grid">
            {/* MIKI Card */}
            <div className="product-card" data-aos="fade-right">
              <div className="product-card-image-container">
                <img
                  src="/spicy-seafood-noodles-with-shrimp.jpg"
                  alt="Miki Noodles"
                  className="product-card-image"
                />
              </div>
              <div className="product-card-content">
                <div className="product-card-title-badge">
                  <h3 className="product-card-title">Miki</h3>
                </div>
                <div className="product-card-description">
                  Fresh egg noodles with rich broth and premium toppings. A
                  classic comfort dish that warms the soul.
                </div>
                <button className="product-card-order-btn">Order Now</button>
              </div>
            </div>

            {/* LOMI Card */}
            <div className="product-card" data-aos="fade-left">
              <div className="product-card-image-container">
                <img
                  src="/traditional-ramen-noodles-with-egg.jpg"
                  alt="Lomi Noodles"
                  className="product-card-image"
                />
              </div>
              <div className="product-card-content">
                <div className="product-card-title-badge">
                  <h3 className="product-card-title">Lomi</h3>
                </div>
                <div className="product-card-description">
                  Thick noodles in savory soup with vegetables and meat. A
                  hearty meal that satisfies every craving.
                </div>
                <button className="product-card-order-btn">Order Now</button>
              </div>
            </div>

            {/* CANTON Card */}
            <div className="product-card" data-aos="fade-right">
              <div className="product-card-image-container">
                <img
                  src="/canton-style-stir-fried-noodles.jpg"
                  alt="Canton Noodles"
                  className="product-card-image"
                />
              </div>
              <div className="product-card-content">
                <div className="product-card-title-badge">
                  <h3 className="product-card-title">Canton</h3>
                </div>
                <div className="product-card-description">
                  Stir-fried noodles with mixed vegetables and your choice of
                  protein. Bold flavors in every bite.
                </div>
                <button className="product-card-order-btn">Order Now</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* <section className="features">
        <div className="features-container">
          <div className="feature">
            <div className="feature-icon">🍜</div>
            <h3>Fresh Ingredients</h3>
            <p>We use only the freshest ingredients sourced daily from local suppliers</p>
          </div>
          <div className="feature">
            <div className="feature-icon">⚡</div>
            <h3>Quick Service</h3>
            <p>Fast preparation without compromising on quality and taste</p>
          </div>
          <div className="feature">
            <div className="feature-icon">❤️</div>
            <h3>Made with Love</h3>
            <p>Every bowl is crafted with care and traditional cooking methods</p>
          </div>
        </div>
      </section> */}

      <section id="about" className="about animate-fadeInUp animate-delay-3" data-aos="fade-up">
        <div className="about-container">
          {/* <div className="about-hero">
            <div className="about-content">
              <h2 className="about-title">About Us</h2>
              <p className="about-subtitle">
                Crafting Authentic Flavors Since Day One
              </p>
              <p className="about-text">
                At Jebran Miki, we are passionate about creating the perfect
                bowl of noodles. Our journey began with a simple idea: to bring
                the authentic flavors of Asia to your doorstep with
                uncompromising quality and care. Every bowl tells a story of
                tradition, innovation, and the pursuit of culinary excellence.
              </p>
              <p className="about-text">
                We have since grown into a trusted brand, known for our
                commitment to quality, authenticity, and the warmth that comes
                with every meal. Our chefs combine time-honored techniques with
                the freshest ingredients to create noodle dishes that comfort
                the soul and satisfy the senses.
              </p>
            </div>
            <div className="about-image-container">
              <img
                src="/chef-cooking-noodles.jpg"
                alt="Chef preparing fresh noodles"
                className="about-image"
              />
            </div>
          </div> */}

          <div className="about-stats" >
            <div className="stat-card">
              <div className="stat-number">15+</div>
              <div className="stat-label">Years Experience</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">50K+</div>
              <div className="stat-label">Happy Customers</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">100%</div>
              <div className="stat-label">Fresh Daily</div>
            </div>
          </div>

          <div className="about-values">
            <h3 className="values-title">Our Values</h3>
            <div className="values-grid">
              <div className="value-item">
                <div className="value-icon">🍜</div>
                <div className="value-content">
                  <h4>Authentic Recipes</h4>
                  <p>
                    Traditional slow-simmered broths and time-tested recipes
                    passed down through generations
                  </p>
                </div>
              </div>
              <div className="value-item">
                <div className="value-icon">🌱</div>
                <div className="value-content">
                  <h4>Fresh Daily</h4>
                  <p>
                    Premium ingredients sourced locally and fresh noodles made
                    daily in our kitchen
                  </p>
                </div>
              </div>
              <div className="value-item">
                <div className="value-icon">⚡</div>
                <div className="value-content">
                  <h4>Quick Service</h4>
                  <p>
                    Fast, friendly service without compromising on quality or
                    the care we put into every bowl
                  </p>
                </div>
              </div>
              <div className="value-item">
                <div className="value-icon">❤️</div>
                <div className="value-content">
                  <h4>Made with Love</h4>
                  <p>
                    Every bowl is crafted with passion, care, and dedication to
                    bringing you comfort and joy
                  </p>
                </div>
              </div>
            </div>
            <div className="about-cta">
              <button className="btn-about-enhanced">
                Discover Our Story
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </section>
      {/* Contact Section */}
      <section
        id="contact"
        className="py-16 bg-[#fffbe8] animate-fadeInUp animate-delay-4" data-aos="fade-up" data-aos-delay="100"
      >
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-light text-[#f08b51] mb-4 tracking-wide">
              Get in Touch
            </h2>
            <div className="w-16 h-1 bg-[#f08b51] mx-auto mb-6"></div>
            <p className="text-lg text-[#3f3f46] max-w-2xl mx-auto leading-relaxed">
              Have questions about our noodles or want to place a special order?
              We'd love to hear from you!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-semibold text-[#f08b51] mb-6">
                  Contact Information
                </h3>

                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-[#f08b51] flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#3f3f46] mb-1">
                        Visit Our Restaurant
                      </h4>
                      <p className="text-[#6b7280]">
                        123 Noodle Street
                        <br />
                        Food District, City 12345
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-[#f08b51] flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#3f3f46] mb-1">
                        Call Us
                      </h4>
                      <p className="text-[#6b7280]">(555) 123-4567</p>
                      <p className="text-sm text-[#9ca3af]">
                        Mon-Sun: 11AM - 10PM
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-[#f08b51] flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#3f3f46] mb-1">
                        Email Us
                      </h4>
                      <p className="text-[#6b7280]">info@jebranmiki.com</p>
                      <p className="text-sm text-[#9ca3af]">
                        We'll respond within 24 hours
                      </p>
                    </div>
                  </div>
                </div>

                {/* Social Media Links */}
                <div className="mt-8">
                  <h4 className="font-semibold text-[#3f3f46] mb-4">
                    Follow Us
                  </h4>
                  <div className="flex space-x-4">
                    <a
                      href="#"
                      className="w-10 h-10 rounded-full bg-[#f08b51] flex items-center justify-center text-white hover:bg-[#e07a42] transition-colors"
                    >
                      <span className="text-sm font-bold">f</span>
                    </a>
                    <a
                      href="#"
                      className="w-10 h-10 rounded-full bg-[#f08b51] flex items-center justify-center text-white hover:bg-[#e07a42] transition-colors"
                    >
                      <span className="text-sm font-bold">@</span>
                    </a>
                    <a
                      href="#"
                      className="w-10 h-10 rounded-full bg-[#f08b51] flex items-center justify-center text-white hover:bg-[#e07a42] transition-colors"
                    >
                      <span className="text-sm font-bold">in</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h3 className="text-2xl font-semibold text-[#f08b51] mb-6">
                Send us a Message
              </h3>
              <form className="space-y-6 bg-[#fffbe8] border-2 border-[#f08b51] rounded-3xl p-8 shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="name"
                      className="font-semibold text-[#3f3f46] flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4 text-[#f08b51]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      placeholder="Your full name"
                      className="w-full p-4 border-2 border-[#f6d5bf] rounded-xl bg-white text-[#111827] outline-none focus:border-[#f08b51] focus:shadow-lg transition-all placeholder-[#9ca3af]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="email"
                      className="font-semibold text-[#3f3f46] flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4 text-[#f08b51]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      placeholder="your.email@example.com"
                      className="w-full p-4 border-2 border-[#f6d5bf] rounded-xl bg-white text-[#111827] outline-none focus:border-[#f08b51] focus:shadow-lg transition-all placeholder-[#9ca3af]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="subject"
                    className="font-semibold text-[#3f3f46] flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4 text-[#f08b51]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    placeholder="What's this about?"
                    className="w-full p-4 border-2 border-[#f6d5bf] rounded-xl bg-white text-[#111827] outline-none focus:border-[#f08b51] focus:shadow-lg transition-all placeholder-[#9ca3af]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="message"
                    className="font-semibold text-[#3f3f46] flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4 text-[#f08b51]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    placeholder="Tell us more about your inquiry..."
                    rows={5}
                    className="w-full p-4 border-2 border-[#f6d5bf] rounded-xl bg-white text-[#111827] min-h-[140px] resize-vertical outline-none focus:border-[#f08b51] focus:shadow-lg transition-all placeholder-[#9ca3af]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#f08b51] text-white px-8 py-4 rounded-full font-semibold text-lg tracking-wide transition-all duration-300 hover:bg-[#e07a42] hover:shadow-lg hover:transform hover:-translate-y-1 active:transform active:translate-y-0 flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer animate-fadeInUp animate-delay-5">
        <div className="footer-container">
          <div className="footer-section">
            <h4>Jebran Miki</h4>
            <p>
              Bringing you the finest noodles with authentic flavors and fresh
              ingredients.
            </p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li>
                <a href="#home">Home</a>
              </li>
              <li>
                <a href="#products">Products</a>
              </li>
              <li>
                <a href="#about">About</a>
              </li>
              <li>
                <a href="#contact">Contact</a>
              </li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Contact Info</h4>
            <p>Email: info@jebranmiki.com</p>
            <p>Phone: (555) 123-4567</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 Jebran Miki. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
