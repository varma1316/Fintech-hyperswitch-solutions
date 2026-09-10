import React, { useState } from "react";
import { ShoppingBag, Search, User, LogOut, Menu, X, ShieldCheck } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { rum } from "../telemetry/rum";

export default function Navbar({ currentView, setCurrentView, onSearch, selectedCategory, setSelectedCategory }) {
  const { itemCount, setIsCartOpen } = useCart();
  const { user, isAuthenticated, logout, setIsAuthModalOpen } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const categories = ["All", "Electronics", "Apparel", "Footwear", "Accessories", "Home & Living"];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    rum.trackInteraction("search_query", "navbar_search", { query: searchTerm });
    onSearch(searchTerm);
    if (currentView !== "catalog") setCurrentView("catalog");
  };

  const handleCategoryClick = (cat) => {
    rum.trackInteraction("category_filter", "navbar", { category: cat });
    setSelectedCategory(cat);
    if (currentView !== "catalog") setCurrentView("catalog");
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      {/* Top utility ticker */}
      <div className="bg-slate-900 text-white text-xs py-1.5 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
        <span>Enterprise 256-Bit Encrypted Payments Powered by <strong>Hyperswitch</strong></span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div 
            onClick={() => { setCurrentView("home"); rum.trackPageView("home"); }}
            className="cursor-pointer flex items-center gap-2 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              A
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">Aura</span>
              <span className="text-xs ml-1 font-semibold uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">Store</span>
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Search products, brands, essentials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 border border-transparent focus:border-teal-500 focus:bg-white rounded-full py-2 pl-10 pr-4 text-sm outline-none transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Catalog link */}
            <button
              onClick={() => { setCurrentView("catalog"); rum.trackPageView("catalog"); }}
              className={`text-sm font-semibold transition px-3 py-1.5 rounded-lg ${
                currentView === "catalog" ? "text-teal-600 bg-teal-50" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Browse
            </button>

            {/* Orders link (if authenticated) */}
            {isAuthenticated && (
              <button
                onClick={() => { setCurrentView("orders"); rum.trackPageView("orders"); }}
                className={`text-sm font-semibold transition px-3 py-1.5 rounded-lg ${
                  currentView === "orders" ? "text-teal-600 bg-teal-50" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                My Orders
              </button>
            )}

            {/* User Auth */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-xs font-semibold text-slate-700 bg-slate-100 py-1 px-2.5 rounded-full">
                  Hi, {user.first_name || user.username}
                </span>
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-2 text-slate-500 hover:text-rose-600 rounded-full hover:bg-slate-100 transition"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                data-rum="open_auth_modal"
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-teal-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}

            {/* Cart trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              data-rum="open_cart"
              className="relative p-2.5 bg-slate-900 hover:bg-teal-600 text-white rounded-full transition-colors shadow-sm"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-teal-400 text-slate-900 text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Category Navigation Bar */}
        <nav className="hidden md:flex items-center gap-6 overflow-x-auto py-2.5 border-t border-slate-100 text-xs font-medium text-slate-600">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`whitespace-nowrap transition-colors hover:text-teal-600 ${
                selectedCategory === cat ? "text-teal-600 font-bold border-b-2 border-teal-600 pb-0.5" : ""
              }`}
            >
              {cat}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 rounded-lg py-2 pl-9 pr-3 text-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-teal-50 font-medium text-slate-700"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
