import React from "react";
import { ShieldCheck, Truck, RefreshCw, Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 mt-20 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Value props banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-slate-800 text-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Free Express Shipping</h4>
              <p className="text-xs text-slate-400">On all orders over $150</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Hyperswitch Zero-Trust</h4>
              <p className="text-xs text-slate-400">PCI-DSS Level 1 compliant</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white">30-Day Easy Returns</h4>
              <p className="text-xs text-slate-400">Hassle-free refunds policy</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Real-Time RUM Telemetry</h4>
              <p className="text-xs text-slate-400">End-to-end distributed tracing</p>
            </div>
          </div>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12">
          <div>
            <h5 className="font-bold text-white text-sm mb-4 tracking-wider uppercase">Shop</h5>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-teal-400 transition">Electronics & Audio</a></li>
              <li><a href="#" className="hover:text-teal-400 transition">Minimalist Apparel</a></li>
              <li><a href="#" className="hover:text-teal-400 transition">Footwear & Sneakers</a></li>
              <li><a href="#" className="hover:text-teal-400 transition">Home & Coffee Gear</a></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white text-sm mb-4 tracking-wider uppercase">Architecture</h5>
            <ul className="space-y-2 text-xs">
              <li><span className="text-teal-400 font-mono">auth-service (Node.js)</span></li>
              <li><span className="text-teal-400 font-mono">product-service (FastAPI)</span></li>
              <li><span className="text-teal-400 font-mono">cart-service (Express)</span></li>
              <li><span className="text-teal-400 font-mono">order-service + SNS/SQS</span></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white text-sm mb-4 tracking-wider uppercase">Payment Switch</h5>
            <ul className="space-y-2 text-xs">
              <li><span className="text-slate-400">Hyperswitch Router (Rust)</span></li>
              <li><span className="text-slate-400">Dynamic Gateway Routing</span></li>
              <li><span className="text-slate-400">Unified Web Checkout SDK</span></li>
              <li><span className="text-slate-400">Istio Ambient Mesh Protected</span></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white text-sm mb-4 tracking-wider uppercase">Stay Updated</h5>
            <p className="text-xs text-slate-400 mb-3">Get exclusive offers and platform release notes.</p>
            <div className="flex">
              <input
                type="email"
                placeholder="Enter email"
                className="bg-slate-800 border border-slate-700 rounded-l-lg px-3 py-2 text-xs text-white outline-none focus:border-teal-500 w-full"
              />
              <button className="bg-teal-500 hover:bg-teal-600 text-slate-900 font-bold px-4 py-2 rounded-r-lg text-xs transition">
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 Aura E-Commerce Platform. All rights reserved. Powered by Hyperswitch & AWS Cloud.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">System Status</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
