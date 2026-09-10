import React, { useState } from "react";
import { X, Trash2, Plus, Minus, Tag, ArrowRight, ShieldCheck } from "lucide-react";
import { useCart } from "../context/CartContext";
import { rum } from "../telemetry/rum";

export default function CartDrawer({ onProceedToCheckout }) {
  const {
    items,
    itemCount,
    subtotal,
    discount,
    shipping,
    tax,
    total,
    promoCode,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    applyPromo
  } = useCart();

  const [inputPromo, setInputPromo] = useState("");
  const [promoMessage, setPromoMessage] = useState(null);

  if (!isCartOpen) return null;

  const handleApplyPromo = (e) => {
    e.preventDefault();
    const result = applyPromo(inputPromo);
    setPromoMessage(result);
  };

  const handleCheckoutClick = () => {
    rum.trackInteraction("proceed_to_checkout", "cart_drawer", { total, itemCount });
    setIsCartOpen(false);
    onProceedToCheckout();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Shopping Cart</h2>
              <p className="text-xs text-slate-500">{itemCount} items ready for checkout</p>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Tag className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-800 text-base mb-1">Your cart is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mb-6">
                  Explore our curated multi-category catalog to discover premium gear and apparel.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="bg-slate-900 hover:bg-teal-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-20 h-20 object-cover rounded-lg bg-white border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 text-xs truncate mb-1">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 uppercase font-medium mb-2">{item.category}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 text-sm">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>

                      {/* Quantity Stepper */}
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 hover:bg-slate-100 text-slate-600"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-xs font-bold text-slate-800">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 hover:bg-slate-100 text-slate-600"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-slate-400 hover:text-rose-600 transition p-1"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Summary */}
          {items.length > 0 && (
            <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-4">
              {/* Promo code box */}
              <form onSubmit={handleApplyPromo} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Coupon code (SAVE10, SAVE20)"
                  value={inputPromo}
                  onChange={(e) => setInputPromo(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs flex-1 outline-none focus:border-teal-500 uppercase"
                />
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
                >
                  Apply
                </button>
              </form>

              {promoMessage && (
                <p className={`text-xs font-medium ${promoMessage.success ? "text-emerald-600" : "text-rose-600"}`}>
                  {promoMessage.message}
                </p>
              )}

              {/* Order breakdown */}
              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-teal-600 font-semibold">
                    <span>Discount ({promoCode})</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? <strong className="text-emerald-600">FREE</strong> : `$${shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Due</span>
                  <span className="text-teal-600">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckoutClick}
                data-rum="checkout_cta"
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-teal-600/25 flex items-center justify-center gap-2 transition text-sm"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                <span>Protected by Hyperswitch Routing Engine</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
