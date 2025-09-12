"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "./Home.css"

const Orders = () => {
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
      <section className="orders-section">
        <div className="orders-container">
          <div className="orders-header">
            <h1 className="orders-title">Your Orders</h1>
            <p className="orders-subtitle">Track and manage your noodle orders</p>
          </div>

          <div className="orders-content">
            <div className="orders-empty">
              <div className="empty-icon">🍜</div>
              <h3>No orders yet</h3>
              <p>Start your noodle journey by placing your first order!</p>
              <button 
                className="btn-primary"
                onClick={() => navigate('/products')}
              >
                Browse Products
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Orders