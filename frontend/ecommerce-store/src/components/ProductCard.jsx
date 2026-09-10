import React from "react";
import { Star, Plus } from "lucide-react";
import { useCart } from "../context/CartContext";

export default function ProductCard({ product, onSelectProduct }) {
  const { addToCart } = useCart();

  const discountPercent = product.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : null;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-teal-400/50 transition-all flex flex-col">
      {/* Image container */}
      <div 
        onClick={() => onSelectProduct(product)}
        className="relative aspect-square overflow-hidden bg-slate-100 cursor-pointer"
      >
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Category tag */}
        <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur text-white text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
          {product.category}
        </span>

        {/* Discount badge */}
        {discountPercent && (
          <span className="absolute top-3 right-3 bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow">
            -{discountPercent}%
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Rating */}
        <div className="flex items-center gap-1 mb-1.5 text-xs text-amber-500">
          <Star className="w-3.5 h-3.5 fill-current" />
          <span className="font-semibold text-slate-800">{product.rating || 4.8}</span>
          <span className="text-slate-400">({product.reviews_count || 120})</span>
        </div>

        {/* Title */}
        <h3
          onClick={() => onSelectProduct(product)}
          className="font-bold text-slate-900 text-sm mb-2 line-clamp-2 cursor-pointer hover:text-teal-600 transition"
        >
          {product.title}
        </h3>

        {/* Description snippet */}
        <p className="text-slate-500 text-xs line-clamp-2 mb-4 flex-1">
          {product.description}
        </p>

        {/* Price & Add to Cart button */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-slate-900">${product.price.toFixed(2)}</span>
              {product.compare_at_price && (
                <span className="text-xs text-slate-400 line-through">
                  ${product.compare_at_price.toFixed(2)}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold text-emerald-600">In Stock ({product.stock})</span>
          </div>

          <button
            onClick={() => addToCart(product, 1)}
            data-rum={`add_cart_${product.id}`}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-teal-500 text-slate-900 hover:text-white transition-all shadow-sm flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white"
            title="Add to Cart"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
