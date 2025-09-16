"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "./Home.css"

const About = () => {
  const [role, setRole] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("access")
    if (!token) {
      setRole(null)
      return
    }
    fetch(`${import.meta.env.VITE_ACCOUNTS_URL}/users/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.role) setRole(data.role)
        else setRole(null)
      })
      .catch(() => setRole(null))
  }, [])

  useEffect(() => {
    if (role === "reseller" && window.location.pathname === "/dashboard") {
      navigate("/")
    }
  }, [role, navigate])

  return (
    <div className="root">
      <section id="about" className="about">
        <div className="about-container">
          <div className="about-hero">
            <div className="about-content">
              <h2 className="about-title">About Us</h2>
              <p className="about-subtitle">Crafting Authentic Flavors Since Day One</p>
              <p className="about-text">
                At Jebran Miki, we are passionate about creating the perfect bowl of noodles. Our journey began with a
                simple idea: to bring the authentic flavors of Asia to your doorstep with uncompromising quality and
                care. Every bowl tells a story of tradition, innovation, and the pursuit of culinary excellence.
              </p>
              <p className="about-text">
                We have since grown into a trusted brand, known for our commitment to quality, authenticity, and the
                warmth that comes with every meal. Our chefs combine time-honored techniques with the freshest
                ingredients to create noodle dishes that comfort the soul and satisfy the senses.
              </p>
            </div>
            <div className="about-image-container">
              <img src="/chef-cooking-noodles.jpg" alt="Chef preparing fresh noodles" className="about-image" />
            </div>
          </div>

          <div className="about-stats">
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
                  <p>Traditional slow-simmered broths and time-tested recipes passed down through generations</p>
                </div>
              </div>
              <div className="value-item">
                <div className="value-icon">🌱</div>
                <div className="value-content">
                  <h4>Fresh Daily</h4>
                  <p>Premium ingredients sourced locally and fresh noodles made daily in our kitchen</p>
                </div>
              </div>
              <div className="value-item">
                <div className="value-icon">⚡</div>
                <div className="value-content">
                  <h4>Quick Service</h4>
                  <p>Fast, friendly service without compromising on quality or the care we put into every bowl</p>
                </div>
              </div>
              <div className="value-item">
                <div className="value-icon">❤️</div>
                <div className="value-content">
                  <h4>Made with Love</h4>
                  <p>Every bowl is crafted with passion, care, and dedication to bringing you comfort and joy</p>
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
    </div>
  )
}

export default About 