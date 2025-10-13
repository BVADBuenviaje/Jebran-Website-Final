"use client";

import { useEffect, useState } from "react";
import "../styles/Home.css";
import { ChefHat, Star, MapPin, Phone, Mail, Clock, Leaf, Zap, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom"; // <-- Make sure this is imported
import ScrollingTitle from "../components/ScrollingTitle";
import AOS from "aos";
import "aos/dist/aos.css";

const Home = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    AOS.init({ once: true, duration: 1000 });
    setIsVisible(true);
  }, []);

  const colors = {
    primary: "#f08b51",
    secondary: "#bb6653",
    white: "#ffffff",
    cream: "#f6d5bf",
    dark: "#1a1a1a",
  };

  // Lightweight UI shims so JSX below compiles
  const Button = (props) => <button {...props} />;
  const Badge = (props) => <span {...props} />;
  const Card = (props) => <div {...props} />;
  const CardContent = (props) => <div {...props} />;

  // Add missing state and navigation
  const [role, setRole] = useState(null);
  const navigate = useNavigate(); // <-- ADD THIS LINE

  // Add missing fetchWithAuth function or import it if available
  const fetchWithAuth = async (url) => {
    const token = localStorage.getItem("access");
    return fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      setRole(null);
      return;
    }
    fetchWithAuth(`${import.meta.env.VITE_ACCOUNTS_URL}/users/me/`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.role) setRole(data.role);
        else setRole(null);
      })
      .catch(() => setRole(null));
  }, []);

  useEffect(() => {
    if (role === "reseller" && window.location.pathname === "/dashboard") {
      navigate("/"); // <-- This will now work!
    }
  }, [role, navigate]);

  return (
    <div className="min-h-screen bg-white-custom">
      {/* Navigation */}
      {/* <nav
        className="fixed top-0 w-full backdrop-blur-sm border-b z-50"
        style={{ backgroundColor: `${colors.white}f0`, borderColor: colors.cream }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <ChefHat className="h-8 w-8" style={{ color: colors.primary }} />
              <span className="text-2xl font-bold" style={{ color: colors.dark }}>
                Jebran Miki
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection("home")}
                className="transition-colors hover:opacity-80"
                style={{ color: colors.dark }}
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection("menu")}
                className="transition-colors hover:opacity-80"
                style={{ color: colors.dark }}
              >
                Menu
              </button>
              <button
                onClick={() => scrollToSection("about")}
                className="transition-colors hover:opacity-80"
                style={{ color: colors.dark }}
              >
                About
              </button>
              <button
                onClick={() => scrollToSection("contact")}
                className="transition-colors hover:opacity-80"
                style={{ color: colors.dark }}
              >
                Contact
              </button>
            </div>
            <Button className="hover:opacity-90 bg-primary-custom text-white-custom">
              Order Now
            </Button>
          </div>
        </div>
      </nav> */}

      {/* Hero Section */}
      <section
        id="home"
        className="pt-16 min-h-screen flex items-center gradient-white-cream"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div
              className={`space-y-8 transition-all duration-1000 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"}`}
            >
              <div className="space-y-4">
                <div className="product-card-title-badge text-sm py-1 badge-cream-secondary badge-wide">
                  Authentic Asian Noodles
                </div>
                <h1 className="text-5xl lg:text-7xl leading-tight text-dark-custom buda-fs">
                  Jebran <span className="text-primary-custom">Miki</span>
                </h1>
                <p className="text-xl leading-relaxed max-w-lg text-secondary-custom">
                  Where comfort meets flavor in every bowl. We deliver delicious, handcrafted noodles made with fresh
                  ingredients and bold, unforgettable taste.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
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
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-3 text-lg hover:opacity-80 bg-transparent btn-outline-primary"
                  onClick={() => {
                    const productsSection = document.getElementById("about");
                    if (productsSection) {
                      productsSection.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                >
                  Reach Us
                </Button>
              </div>
              <div className="flex items-center space-x-6 pt-4">
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="ml-2 text-sm text-secondary-custom">
                    4.9 (2,000+ reviews)
                  </span>
                </div>
              </div>
            </div>
            <div
              className={`relative transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"}`}
            >
              <div className="relative" >
                <img
                  src="/delicious-noodle-bowl-with-colorful-ingredients.jpg"                  
                  alt="Delicious noodle bowl"
                  className="w-full h-[600px] object-cover rounded-3xl shadow-2xl" data-aos="fade-left"
                />
                <div
                  className="absolute -bottom-6 -left-6 rounded-2xl p-6 shadow-lg border bg-white-custom border-cream-custom" data-aos="fade-up"
                >
                  <div className="flex items-center space-x-3" data-aos="fade-up">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center bg-primary-custom"
                    >
                      <ChefHat className="h-6 w-6 text-white-custom" />
                    </div>
                    <div >
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

      {/* Menu Section */}
      <section id="products" className="py-20 bg-cream-50" >
      <ScrollingTitle text="Specialties" repetitions={2000} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 " data-aos="fade-up">
          <div className="text-center mb-16">
            {/* <Badge
              variant="secondary"
              className="mb-4 badge-cream-secondary badge-simple"
            >
              Our Specialties
            </Badge> */}
            <h2 className="text-4xl lg:text-5xl font-heavy mb-6 text-dark-custom mt-8">
              Signature <span className="text-primary-custom">Noodles</span>
            </h2>
            <p className="text-xl max-w-3xl mx-auto text-secondary-custom">
              Each noodle is crafted with passion, using traditional recipes and the freshest ingredients
            </p>
          </div>

          <div className="flex flex-col gap-8 items-center">
            {/* Miki Card */}
                        <Card data-aos="fade-left"
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border card-surface-white border-cream-custom menu-card flex flex-col md:flex-row overflow-hidden items-stretch"
            >
              <div className="relative overflow-hidden md:w-1/2">
                <img
                  src="/canton-style-stir-fried-noodles.jpg"
                  alt="Miki Noodles"
                  className="w-full menu-image group-hover:scale-105 transition-transform duration-300"
                />
                {/* <Badge
                  className="absolute top-4 left-4 badge-cream-secondary badge-simple"
                 >
                   Chef's Special
                </Badge> */}
              </div>
              <CardContent className="p-6 md:w-1/2">
                <h3 className="text-5xl font-heavy mb-10 mt-4 text-dark-custom buda-fs-mini">
                  Miki
                </h3>
                <p className="mb-4 leading-relaxed text-secondary-custom">
                  Fresh egg noodles with rich broth and premium toppings. A classic comfort dish that warms the soul
                  with every spoonful.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-heavy text-price-primary">
                    $12.99/kg
                  </span>
                  <Button className="hover:opacity-90 bg-primary-custom text-white-custom badge-simple" >
                    Order Now
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Lomi Card */}
                        <Card data-aos="fade-right"
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border card-surface-white border-cream-custom menu-card flex flex-col md:flex-row overflow-hidden items-stretch"
            >
              <div className="relative overflow-hidden md:w-1/2">
                <img
                  src="/traditional-ramen-noodles-with-egg.jpg"
                  alt="Lomi Noodles"
                  className="w-full menu-image group-hover:scale-105 transition-transform duration-300"
                />
                {/* <Badge
                  className="absolute top-4 left-4 badge-cream-secondary badge-simple"
                 >
                  Popular
                </Badge> */}
              </div>
              <CardContent className="p-6 md:w-1/2">
                <h3 className="text-5xl font-heavy mb-10 mt-4 text-dark-custom buda-fs-mini">
                  Lomi
                </h3>
                <p className="mb-4 leading-relaxed text-secondary-custom">
                  Thick noodles in savory soup with vegetables and meat. A hearty meal that satisfies every craving with
                  authentic flavors.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-heavy text-price-primary">
                    $14.99/kg
                  </span>
                  <Button className="hover:opacity-90 bg-primary-custom text-white-custom badge-simple">
                    Order Now
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Canton Card */}
                        <Card data-aos="fade-left"
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border card-surface-white border-cream-custom menu-card flex flex-col md:flex-row overflow-hidden items-stretch"
            >
              <div className="relative overflow-hidden md:w-1/2">
                <img
                  src="/spicy-seafood-noodles-with-shrimp.jpg"
                  alt="Canton Noodles"
                  className="w-full menu-image group-hover:scale-105 transition-transform duration-300"
                />
                {/* <Badge
                  className="absolute top-4 left-4 badge-cream-secondary badge-simple"
                 >
                  Signature
                </Badge> */}
              </div>
              <CardContent className="p-6 md:w-1/2">
                <h3 className="text-5xl font-heavy mb-10 mt-4 text-dark-custom buda-fs-mini">
                  Canton
                </h3>
                <p className="mb-4 leading-relaxed text-secondary-custom">
                  Stir-fried noodles with mixed vegetables and your choice of protein. Bold flavors in every bite with
                  perfect texture.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-heavy text-price-primary">
                    $13.99/kg
                  </span>
                  <Button className="hover:opacity-90 bg-primary-custom text-white-custom badge-simple">
                    Order Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white-custom" data-aos="fade-up">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge
              variant="secondary"
              className="mb-4 badge-cream-secondary badge-simple"
            >
              Our Story
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-heavy mb-6 text-dark-custom mt-8">
              Crafting <span className="text-primary-custom buda-fs-mini">Authentic</span> Flavors
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
                50K+
              </div>
              <div className="text-lg text-secondary-custom">
                Happy Customers
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl lg:text-5xl font-bold mb-2 text-primary-custom">
                100%
              </div>
              <div className="text-lg text-secondary-custom">
                Fresh Daily
              </div>
            </div>
          </div>

          {/* Values */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center space-y-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ backgroundColor: `${colors.primary}20` }}
              >
                <ChefHat className="h-8 w-8" style={{ color: colors.primary }} />
              </div>
              <h3 className="text-xl font-semibold text-dark-custom">
                Authentic Recipes
              </h3>
              <p className="text-secondary-custom">
                Traditional slow-simmered broths and time-tested recipes passed down through generations
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
                Premium ingredients sourced locally and fresh noodles made daily in our kitchen
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
                Fast, friendly service without compromising on quality or the care we put into every bowl
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
                Every bowl is crafted with passion, care, and dedication to bringing you comfort and joy
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-cream-50" >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" data-aos="fade-up">
          <div className="text-center mb-16">
            <Badge
              variant="secondary"
              className="mb-4 badge-cream-secondary badge-simple"
            >
              Get in Touch
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-heavy mb-6 text-dark-custom mt-8">
              Visit <span className="text-primary-custom">Us</span>
            </h2>
            <p className="text-xl max-w-3xl mx-auto text-secondary-custom">
              Have questions about our noodles or want to place a special order? We'd love to hear from you!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-primary-custom"
                >
                  <MapPin className="h-6 w-6 text-white-custom" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-dark-custom">
                    Visit Our Restaurant
                  </h3>
                  <p className="text-secondary-custom">
                    123 Noodle Street
                    <br />
                    Food District, City 12345
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-primary-custom"
                >
                  <Phone className="h-6 w-6 text-white-custom" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-dark-custom">
                    Call Us
                  </h3>
                  <p className="text-secondary-custom">(555) 123-4567</p>
                  <p className="text-sm text-secondary-custom">
                    Mon-Sun: 11AM - 10PM
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-primary-custom"
                >
                  <Mail className="h-6 w-6 text-white-custom" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-dark-custom">
                    Email Us
                  </h3>
                  <p className="text-secondary-custom">info@jebranmiki.com</p>
                  <p className="text-sm text-secondary-custom">
                    We'll respond within 24 hours
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-primary-custom"
                >
                  <Clock className="h-6 w-6 text-white-custom" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-dark-custom">
                    Opening Hours
                  </h3>
                  <div className="space-y-1 text-secondary-custom">
                    <p>Monday - Friday: 11:00 AM - 10:00 PM</p>
                    <p>Saturday - Sunday: 10:00 AM - 11:00 PM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <Card className="border card-surface-white border-cream-custom">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold mb-6 text-dark-custom">
                  Send us a Message
                </h3>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium mb-2 text-dark-custom">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent border-cream-custom bg-white-custom text-dark-custom"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-2 text-dark-custom">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent border-cream-custom bg-white-custom text-dark-custom"
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium mb-2 text-dark-custom">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent border-cream-custom bg-white-custom text-dark-custom"
                      placeholder="What's this about?"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium mb-2 text-dark-custom">
                      Message
                    </label>
                    <textarea
                      id="message"
                      rows={5}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent resize-vertical border-cream-custom bg-white-custom text-dark-custom"
                      placeholder="Tell us more about your inquiry..."
                    />
                  </div>
                  <Button
                    className="w-full py-3 text-lg hover:opacity-90 bg-primary-custom text-white-custom"
                  >
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-dark-custom text-white-custom">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <ChefHat className="h-8 w-8" style={{ color: colors.primary }} />
                <span className="text-2xl font-bold">Jebran Miki</span>
              </div>
              <p className="text-white-cc">
                Bringing you the finest noodles with authentic flavors and fresh ingredients.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <button
                               onClick={() => {
                const productsSection = document.getElementById("home");
                if (productsSection) {
                  productsSection.scrollIntoView({ behavior: "smooth" });
                }
              }}
                    className="transition-colors hover:opacity-80 text-white-cc"
                  >
                    Home
                  </button>
                </li>
                <li>
                  <button
              onClick={() => {
                const productsSection = document.getElementById("products");
                if (productsSection) {
                  productsSection.scrollIntoView({ behavior: "smooth" });
                }
              }}                    className="transition-colors hover:opacity-80 text-white-cc"
                  >
                    Products
                  </button>
                </li>
                <li>
                  <button
              onClick={() => {
                const productsSection = document.getElementById("about");
                if (productsSection) {
                  productsSection.scrollIntoView({ behavior: "smooth" });
                }
              }}                    className="transition-colors hover:opacity-80 text-white-cc"
                  >
                    About
                  </button>
                </li>
                <li>
                  <button
                                  onClick={() => {
                const productsSection = document.getElementById("contact");
                if (productsSection) {
                  productsSection.scrollIntoView({ behavior: "smooth" });
                }
              }}
                    className="transition-colors hover:opacity-80 text-white-cc"
                  >
                    Contact
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
              <ul className="space-y-2 text-white-cc">
                <li>Email: info@jebranmiki.com</li>
                <li>Phone: (555) 123-4567</li>
                <li>123 Noodle Street, Food District</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Follow Us</h4>
              <div className="flex space-x-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 bg-primary-custom"
                >
                  <span className="font-bold text-white-custom">
                    f
                  </span>
                </div>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 bg-primary-custom"
                >
                  <span className="font-bold text-white-custom">
                    @
                  </span>
                </div>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 bg-primary-custom"
                >
                  <span className="font-bold text-white-custom">
                    in
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center border-white-33">
            <p className="text-white-99">&copy; 2025 Jebran Miki. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home;
