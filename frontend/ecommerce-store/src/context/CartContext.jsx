import React, { createContext, useContext, useState, useEffect } from "react";
import { rum } from "../telemetry/rum";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem("aura_cart_items");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [promoCode, setPromoCode] = useState(() => localStorage.getItem("aura_promo") || null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("aura_cart_items", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (promoCode) localStorage.setItem("aura_promo", promoCode);
    else localStorage.removeItem("aura_promo");
  }, [promoCode]);

  const addToCart = (product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...product, quantity }];
    });

    rum.trackInteraction("add_to_cart", "product_card", {
      productId: product.id,
      title: product.title,
      price: product.price,
      quantity
    });

    setIsCartOpen(true);
  };

  const updateQuantity = (productId, delta) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    rum.trackInteraction("remove_from_cart", "cart_drawer", { productId });
    setItems((prev) => prev.filter((i) => i.id !== productId));
  };

  const clearCart = () => {
    setItems([]);
    setPromoCode(null);
  };

  const applyPromo = (code) => {
    const clean = (code || "").toUpperCase().trim();
    if (clean === "SAVE10" || clean === "SAVE20" || clean === "FREESHIP") {
      setPromoCode(clean);
      rum.trackInteraction("apply_promo", "cart_drawer", { code: clean });
      return { success: true, message: `Promo code ${clean} applied!` };
    }
    return { success: false, message: "Invalid promo code. Try SAVE10, SAVE20 or FREESHIP" };
  };

  // Calculations
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = Number(items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));

  let discount = 0;
  let shipping = subtotal > 150 || items.length === 0 ? 0 : 9.99;

  if (promoCode === "SAVE10" && subtotal >= 50) discount = subtotal * 0.10;
  if (promoCode === "SAVE20" && subtotal >= 100) discount = subtotal * 0.20;
  if (promoCode === "FREESHIP") shipping = 0;

  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Number((taxableAmount * 0.08).toFixed(2));
  const total = Number((taxableAmount + tax + shipping).toFixed(2));

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        discount: Number(discount.toFixed(2)),
        shipping,
        tax,
        total,
        promoCode,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyPromo
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
