import React, { useState, useMemo } from "react";
import { Filter, SlidersHorizontal, Search, RotateCcw } from "lucide-react";
import ProductCard from "../components/ProductCard";

export default function CatalogPage({
  products,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  onSelectProduct
}) {
  const [maxPrice, setMaxPrice] = useState(450);
  const [sortBy, setSortBy] = useState("popular");
  const [onlyInStock, setOnlyInStock] = useState(false);

  const categories = ["All", "Electronics", "Apparel", "Footwear", "Accessories", "Home & Living"];

  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Category filter
    if (selectedCategory && selectedCategory !== "All") {
      list = list.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    // Price filter
    list = list.filter((p) => p.price <= maxPrice);

    // In-stock only
    if (onlyInStock) {
      list = list.filter((p) => p.stock > 0);
    }

    // Sorting
    if (sortBy === "price_low") list.sort((a, b) => a.price - b.price);
    if (sortBy === "price_high") list.sort((a, b) => b.price - a.price);
    if (sortBy === "rating") list.sort((a, b) => b.rating - a.rating);

    return list;
  }, [products, selectedCategory, searchQuery, maxPrice, sortBy, onlyInStock]);

  const resetFilters = () => {
    setSelectedCategory("All");
    setSearchQuery("");
    setMaxPrice(450);
    setSortBy("popular");
    setOnlyInStock(false);
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {selectedCategory === "All" ? "Complete Catalog" : selectedCategory}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Showing {filteredProducts.length} items available for express dispatch
          </p>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-500">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="popular">Most Popular</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Main content grid (Sidebar + Items) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Filter Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-24 self-start bg-white p-5 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <SlidersHorizontal className="w-4 h-4 text-teal-600" />
              <span>Filters</span>
            </div>
            <button
              onClick={resetFilters}
              className="text-[11px] font-semibold text-slate-400 hover:text-teal-600 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Categories</h4>
            <div className="space-y-1 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition ${
                    selectedCategory === cat
                      ? "bg-teal-50 text-teal-800 font-bold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Max Price Slider */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs font-semibold mb-2">
              <span className="text-slate-900">Max Price</span>
              <span className="text-teal-600">${maxPrice}</span>
            </div>
            <input
              type="range"
              min="30"
              max="450"
              step="10"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer"
            />
          </div>

          {/* In stock only toggle */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <label htmlFor="inStock" className="font-semibold text-slate-700 cursor-pointer">
              In Stock Only
            </label>
            <input
              id="inStock"
              type="checkbox"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="lg:col-span-3">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-base mb-1">No products match your criteria</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
                Try widening your price range, clearing your search filter, or selecting a different category.
              </p>
              <button
                onClick={resetFilters}
                className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onSelectProduct={onSelectProduct}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
