import React from "react";
import { CheckCircle, Package, ArrowRight, Truck, Mail, ShieldCheck, Home } from "lucide-react";

export default function OrderSuccessPage({ orderDetails, onContinueShopping, onViewOrders }) {
  const { orderId, customerEmail, total, items = [], shippingAddress = {} } = orderDetails || {};

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Success Hero */}
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle className="w-8 h-8" />
        </div>

        <span className="inline-block text-xs font-bold uppercase tracking-widest text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
          Payment Confirmed
        </span>

        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Thank you for your order!
        </h1>

        <p className="text-sm text-slate-600 max-w-md mx-auto">
          We've received your payment of <strong className="text-slate-900">${total?.toFixed(2)}</strong>. An automated receipt has been dispatched to <span className="font-semibold text-teal-700">{customerEmail}</span> via our AWS SQS Notification worker.
        </p>

        <div className="pt-2">
          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
            Order Reference: #{orderId}
          </span>
        </div>
      </div>

      {/* Order Status Timeline */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <h3 className="font-bold text-slate-900 text-sm">Order Progress & Fulfillment</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-50/60 border border-emerald-200/60 rounded-2xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900">Payment Processed</p>
              <p className="text-[11px] text-slate-500">Hyperswitch Confirmed</p>
            </div>
          </div>

          <div className="p-4 bg-teal-50/60 border border-teal-200/60 rounded-2xl flex items-center gap-3">
            <Package className="w-5 h-5 text-teal-600 shrink-0 animate-bounce" />
            <div>
              <p className="text-xs font-bold text-slate-900">Inventory Reserved</p>
              <p className="text-[11px] text-slate-500">SQS Stock Deducted</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
            <Truck className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900">Carrier Dispatch</p>
              <p className="text-[11px] text-slate-500">Estimated 2-3 Days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Item Summary */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm pb-3 border-b border-slate-100">
          Items in this shipment ({items.length})
        </h3>

        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-100"
                />
                <div>
                  <p className="font-bold text-slate-900">{item.title}</p>
                  <p className="text-slate-400">Qty: {item.quantity} • ${item.price.toFixed(2)} each</p>
                </div>
              </div>
              <span className="font-extrabold text-slate-900">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Shipping address preview */}
        {shippingAddress.street && (
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-600">
            <span className="font-bold text-slate-900 block mb-1">Delivering to:</span>
            <p>{shippingAddress.street}</p>
            <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}</p>
          </div>
        )}
      </div>

      {/* Action CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={onContinueShopping}
          className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-8 rounded-2xl transition text-xs flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Continue Shopping</span>
        </button>

        <button
          onClick={onViewOrders}
          className="w-full sm:w-auto bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-bold py-3.5 px-8 rounded-2xl transition text-xs"
        >
          View Order History
        </button>
      </div>
    </div>
  );
}
