"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import ScrollingTitle from "../components/ScrollingTitle";
import "./Home.css"

const Products = () => {
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
      <section id="products" className="products">
        <hr className="hr1"/>
        <ScrollingTitle text="JEBRAN" repetitions={2000} />
        <hr className="hr2"/>
        <div className="products-container">
          <h2 className="products-title">PRODUCTS</h2>
          <div className="products-grid">
            <div className="group relative overflow-hidden rounded-3xl bg-white shadow-xl transition-all duration-500 hover:scale-105 hover:shadow-2xl">
              <div className="relative h-80 overflow-hidden">
                <img
                  src="/spicy-seafood-noodles-with-shrimp.jpg"
                  alt="Miki Noodles"
                  className="h-100 w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>

              <div className="relative p-8">
                <div className="absolute -top-6 left-8 rounded-full bg-[#F08B51] px-6 py-2">
                  <h3 className="text-5xl font-light tracking-wider text-white">MIKI</h3>
                </div>

                <div className="mt-4">
                  <p className="mb-6 text-1xl leading-relaxed text-[#BB6653]">
                    Fresh egg noodles with rich broth and premium toppings. A classic comfort dish that warms the soul.
                  </p>

                  <button className="w-full rounded-full bg-[#BB6653] py-3 text-1xl font-medium tracking-wide text-white transition-all duration-300 hover:bg-[#9d5544] hover:shadow-lg">
                    Order Now
                  </button>
                </div>
              </div>
            </div>

            {/* LOMI Card */}
            <div className="group relative overflow-hidden rounded-3xl bg-white shadow-xl transition-all duration-500 hover:scale-105 hover:shadow-2xl">
              <div className="relative h-80 overflow-hidden">
                <img
                  src="/traditional-ramen-noodles-with-egg.jpg"
                  alt="Lomi Noodles"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>

              <div className="relative p-8">
                <div className="absolute -top-6 left-8 rounded-full bg-[#F08B51] px-6 py-2">
                  <h3 className="text-5xl font-light tracking-wider text-white">LOMI</h3>
                </div>

                <div className="mt-4">
                  <p className="mb-6 text-1xl leading-relaxed text-[#BB6653]">
                    Thick noodles in savory soup with vegetables and meat. A hearty meal that satisfies every craving.
                  </p>

                  <button className="w-full rounded-full bg-[#BB6653] py-3 text-1xl font-medium tracking-wide text-white transition-all duration-300 hover:bg-[#9d5544] hover:shadow-lg">
                    Order Now
                  </button>
                </div>
              </div>
            </div>
            
            {/* CANTON Card */}
            <div className="group relative overflow-hidden rounded-3xl bg-white shadow-xl transition-all duration-500 hover:scale-105 hover:shadow-2xl md:col-span-2 lg:col-span-1">
              <div className="relative h-80 overflow-hidden">
                <img
                  src="/canton-style-stir-fried-noodles.jpg"
                  alt="Canton Noodles"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>

              <div className="relative p-8">
                <div className="absolute -top-6 left-8 rounded-full bg-[#F08B51] px-6 py-2">
                  <h3 className="text-5xl font-light tracking-wider text-white">CANTON</h3>
                </div>

                <div className="mt-4">
                  <p className="mb-6 text-1xl leading-relaxed text-[#BB6653]">
                    Stir-fried noodles with mixed vegetables and your choice of protein. Bold flavors in every bite.
                  </p>

                  <button className="w-full rounded-full bg-[#BB6653] py-3 text-1xl font-medium tracking-wide text-white transition-all duration-300 hover:bg-[#9d5544] hover:shadow-lg">
                    Order Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Products 