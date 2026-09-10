import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import AuthModal from "./components/AuthModal";
import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import { api, FALLBACK_PRODUCTS } from "./services/api";
import { rum } from "./telemetry/rum";

export default function App() {
  const [currentView, setCurrentView] = useState("home"); // "home" | "catalog" | "detail" | "checkout" | "success" | "orders"
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastOrderDetails, setLastOrderDetails] = useState(null);

  // Initialize RUM on startup
  useEffect(() => {
    rum.init({ serviceName: "ecommerce-storefront" });
    rum.trackPageView("home");

    // Fetch live catalog from product-service
    api.getProducts()
      .then((data) => {
        if (data && data.products && data.products.length > 0) {
          setProducts(data.products);
        }
      })
      .catch((err) => console.warn("Using fallback catalog products:", err));
  }, []);

  const navigateTo = (view, payload = null) => {
    rum.trackPageView(view);
    setCurrentView(view);
    if (payload) {
      if (view === "detail") setSelectedProduct(payload);
      if (view === "success") setLastOrderDetails(payload);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectProduct = (prod) => {
    navigateTo("detail", prod);
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    navigateTo("catalog");
  };

  const handleSearch = (term) => {
    setSearchQuery(term);
    navigateTo("catalog");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-teal-500 selection:text-white">
      {/* Navigation */}
      <Navbar
        currentView={currentView}
        setCurrentView={navigateTo}
        onSearch={handleSearch}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      {/* Main View Router */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {currentView === "home" && (
          <HomePage
            products={products}
            onSelectProduct={handleSelectProduct}
            onExploreCatalog={() => navigateTo("catalog")}
            onSelectCategory={handleCategorySelect}
          />
        )}

        {currentView === "catalog" && (
          <CatalogPage
            products={products}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {currentView === "detail" && (
          <ProductDetailPage
            product={selectedProduct || products[0]}
            onBack={() => navigateTo("catalog")}
            onCheckoutDirect={() => navigateTo("checkout")}
          />
        )}

        {currentView === "checkout" && (
          <CheckoutPage
            onBack={() => navigateTo("catalog")}
            onOrderSuccess={(details) => navigateTo("success", details)}
          />
        )}

        {currentView === "success" && (
          <OrderSuccessPage
            orderDetails={lastOrderDetails}
            onContinueShopping={() => navigateTo("catalog")}
            onViewOrders={() => navigateTo("orders")}
          />
        )}

        {currentView === "orders" && (
          <OrderHistoryPage
            onBack={() => navigateTo("home")}
            onStartShopping={() => navigateTo("catalog")}
          />
        )}
      </main>

      {/* Slide-out Cart Drawer */}
      <CartDrawer onProceedToCheckout={() => navigateTo("checkout")} />

      {/* User Login/Register Modal */}
      <AuthModal />

      {/* Footer */}
      <Footer />
    </div>
  );
}
