import React from "react";
import { ArrowRight, Sparkles, Shield, Cpu, Award } from "lucide-react";
import ProductCard from "../components/ProductCard";

export default function HomePage({ products, onSelectProduct, onExploreCatalog, onSelectCategory }) {
  const featured = products.filter((p) => p.is_featured).slice(0, 4);

  const categories = [
    { name: "Electronics", desc: "Spatial audio, ambient lighting & workspace tech", count: "12+ items", img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80" },
    { name: "Apparel", desc: "Merino wool and commuter jackets", count: "24+ items", img: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&q=80" },
    { name: "Footwear", desc: "Carbon-plated sneakers and Chelsea boots", count: "18+ items", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80" },
    { name: "Accessories", desc: "Titanium chronographs and leather weekenders", count: "15+ items", img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80" },
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white p-8 sm:p-14 lg:p-20 shadow-2xl border border-slate-800">
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>End-to-End Retail & Payment Switch Demo</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
            Engineered for <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Minimalists</span>.
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
            Aura curates premium everyday essentials, tech instruments, and apparel—powered by an event-driven microservice backbone and Hyperswitch checkout.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button
              onClick={onExploreCatalog}
              data-rum="hero_explore_catalog"
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-7 py-3.5 rounded-2xl shadow-lg shadow-teal-500/25 flex items-center gap-2 transition text-sm"
            >
              <span>Explore Collection</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-400" />
              <span>Coupon <strong>SAVE20</strong> active</span>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute top-1/2 -right-24 -translate-y-1/2 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Category Highlights */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Curated Categories</h2>
            <p className="text-xs text-slate-500">Explore essentials grouped by design philosophy</p>
          </div>
          <button
            onClick={onExploreCatalog}
            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <div
              key={cat.name}
              onClick={() => onSelectCategory(cat.name)}
              className="group relative overflow-hidden rounded-2xl aspect-[4/5] cursor-pointer shadow-sm hover:shadow-xl transition-all border border-slate-200"
            >
              <img
                src={cat.img}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-5 flex flex-col justify-end text-white">
                <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider mb-1">{cat.count}</span>
                <h3 className="text-lg font-bold mb-1">{cat.name}</h3>
                <p className="text-xs text-slate-300 line-clamp-2">{cat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Drops Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">
              <Award className="w-4 h-4" />
              <span>Editor's Picks</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Trending Items</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      </section>

      {/* Architecture Highlights Bar */}
      <section className="bg-slate-100 rounded-3xl p-8 sm:p-12 border border-slate-200">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex p-3 rounded-2xl bg-white text-teal-600 shadow-sm">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Real-Time Payment Routing with Hyperswitch
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Every transaction is orchestrated through Juspay's Hyperswitch Rust engine with dynamic multi-gateway failovers (Stripe, Adyen, PayPal), distributed tracing via our RUM telemetry client, and instant SQS inventory updates.
          </p>
        </div>
      </section>
    </div>
  );
}
