import React, { useState } from "react";
import { Star, ShieldCheck, ArrowLeft, Plus, Minus, ShoppingBag, Check } from "lucide-react";
import { useCart } from "../context/CartContext";

export default function ProductDetailPage({ product, onBack, onCheckoutDirect }) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState("Midnight Black");
  const [isAdded, setIsAdded] = useState(false);

  if (!product) return null;

  const colors = ["Midnight Black", "Slate Grey", "Forest Green"];

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    onCheckoutDirect();
  };

  return (
    <div className="space-y-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition py-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Products</span>
      </button>

      {/* Main product showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm">
        {/* Left image */}
        <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover object-center"
          />
        </div>

        {/* Right details */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
                {product.category}
              </span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                In Stock ({product.stock} available)
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {product.title}
            </h1>

            {/* Ratings */}
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span className="font-bold text-slate-900">{product.rating}</span>
              <span>•</span>
              <span className="underline cursor-pointer">{product.reviews_count || 150} verified buyer reviews</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 pt-2">
              <span className="text-3xl font-black text-slate-900">${product.price.toFixed(2)}</span>
              {product.compare_at_price && (
                <span className="text-base text-slate-400 line-through">
                  ${product.compare_at_price.toFixed(2)}
                </span>
              )}
            </div>

            <p className="text-sm text-slate-600 leading-relaxed pt-2">
              {product.description}
            </p>

            {/* Color variants */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Color Option: <span className="text-teal-600 normal-case">{selectedColor}</span>
              </label>
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                      selectedColor === color
                        ? "border-teal-600 bg-teal-50 text-teal-900 font-bold"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* Key feature bullets */}
            {product.features && (
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Key Highlights</h4>
                <ul className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  {product.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action section */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="flex items-center gap-4">
              {/* Stepper */}
              <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-white rounded-lg text-slate-700 transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-bold text-slate-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-white rounded-lg text-slate-700 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                data-rum="add_to_cart_detail"
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-md transition"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{isAdded ? "Added to Cart ✓" : "Add to Cart"}</span>
              </button>

              {/* Buy Now */}
              <button
                onClick={handleBuyNow}
                data-rum="buy_now_detail"
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 px-6 rounded-2xl text-sm shadow-lg shadow-teal-600/25 transition"
              >
                Buy Now
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Free returns within 30 days. Fast worldwide shipping with carbon-neutral packaging.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
