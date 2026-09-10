import React, { useState, useEffect } from "react";
import { Package, Clock, CheckCircle2, ChevronRight, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export default function OrderHistoryPage({ onBack, onStartShopping }) {
  const { user, isAuthenticated, setIsAuthModalOpen } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);
    // Fetch user orders
    api.createCheckout // or custom fetch
    fetch(`http://localhost:3000/orders/user/${user.id}`)
      .then((res) => (res.ok ? res.json() : { orders: [] }))
      .then((data) => setOrders(data.orders || []))
      .catch(() => {
        // Fallback demo order history
        setOrders([
          {
            id: "ORD-94182",
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            status: "PAID",
            total_amount: 299.99,
            currency: "USD",
            items: [
              {
                id: "prod_tech_01",
                title: "Aura Ultra Wireless Noise-Cancelling Headphones",
                quantity: 1,
                price: 299.99,
                image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80"
              }
            ]
          }
        ]);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
        <Package className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Sign in to view orders</h2>
        <p className="text-xs text-slate-500">Access your past order tracking, receipts, and returns history.</p>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="bg-slate-900 hover:bg-teal-600 text-white text-xs font-bold px-6 py-3 rounded-xl transition"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back link */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition py-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Store</span>
      </button>

      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Your Order History</h1>
          <p className="text-xs text-slate-500">Track current shipments and view historical invoices</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-slate-500">Loading order history...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">No orders found yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You haven't completed any purchases yet. Your purchases will appear here automatically.
          </p>
          <button
            onClick={onStartShopping}
            className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">Order #{order.id}</span>
                    <span className="text-slate-400 text-[11px]">
                      Placed on {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-900 text-sm">
                      ${Number(order.total_amount).toFixed(2)}
                    </span>
                    <span
                      className={`font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        order.status === "PAID"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {order.status || "CONFIRMED"}
                    </span>
                  </div>
                </div>

                {/* Items in order */}
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-10 h-10 object-cover rounded-lg bg-slate-100"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-slate-800">{item.title || "Product"}</p>
                          <p className="text-slate-400 text-[11px]">Qty: {item.quantity || 1}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-slate-700">${item.price?.toFixed(2) || "0.00"}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
