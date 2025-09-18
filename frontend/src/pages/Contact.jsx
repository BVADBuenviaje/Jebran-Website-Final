"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "./Home.css"
import { fetchWithAuth } from "../utils/auth";

const Contact = () => {
  const [role, setRole] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("access")
    if (!token) {
      setRole(null)
      return
    }
    fetchWithAuth(`${import.meta.env.VITE_ACCOUNTS_URL}/users/me/`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.role) setRole(data.role);
        else setRole(null);
      })
      .catch(() => setRole(null));
  }, [])

  useEffect(() => {
    if (role === "reseller" && window.location.pathname === "/dashboard") {
      navigate("/")
    }
  }, [role, navigate])

  return (
    <div className="root">
      <section id="contact" className="contact-section">
        <div className="contact-container">
          <div className="contact-header">
            <h2 className="contact-main-title">Get in Touch</h2>
            <div className="contact-title-divider"></div>
            <p className="contact-description">
              Have questions about our noodles or want to place a special order? We'd love to hear from you!
            </p>
          </div>

          <div className="contact-content">
            {/* Contact Information */}
            <div className="contact-info-section">
              <div>
                <h3 className="contact-info-title">Contact Information</h3>

                <div className="contact-info-list">
                  <div className="contact-info-item">
                    <div className="contact-info-icon">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <div className="contact-info-details">
                      <h4>Visit Our Restaurant</h4>
                      <p>
                        123 Noodle Street
                        <br />
                        Food District, City 12345
                      </p>
                    </div>
                  </div>

                  <div className="contact-info-item">
                    <div className="contact-info-icon">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                    </div>
                    <div className="contact-info-details">
                      <h4>Call Us</h4>
                      <p>(555) 123-4567</p>
                      <p className="contact-hours">Mon-Sun: 11AM - 10PM</p>
                    </div>
                  </div>

                  <div className="contact-info-item">
                    <div className="contact-info-icon">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div className="contact-info-details">
                      <h4>Email Us</h4>
                      <p>info@jebranmiki.com</p>
                      <p className="contact-hours">We'll respond within 24 hours</p>
                    </div>
                  </div>
                </div>

                {/* Social Media Links */}
                <div className="contact-social">
                  <h4>Follow Us</h4>
                  <div className="contact-social-links">
                    <a href="#" className="contact-social-link">
                      <span>f</span>
                    </a>
                    <a href="#" className="contact-social-link">
                      <span>@</span>
                    </a>
                    <a href="#" className="contact-social-link">
                      <span>in</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="contact-form-section">
              <h3>Send us a Message</h3>
              <form className="contact-form">
                <div className="contact-form-row">
                  <div className="contact-form-group">
                    <label htmlFor="name" className="contact-form-label">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="contact-form-input"
                    />
                  </div>
                  <div className="contact-form-group">
                    <label htmlFor="email" className="contact-form-label">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="contact-form-input"
                    />
                  </div>
                </div>

                <div className="contact-form-group">
                  <label htmlFor="subject" className="contact-form-label">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="contact-form-input"
                  />
                </div>

                <div className="contact-form-group">
                  <label htmlFor="message" className="contact-form-label">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="contact-form-textarea"
                  />
                </div>

                <button type="submit" className="contact-form-submit">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </div>
  )
}

export default Contact 