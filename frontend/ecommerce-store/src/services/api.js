// API Client linking Frontend to all Microservices

const PRODUCT_SERVICE_URL = import.meta.env.VITE_PRODUCT_SERVICE_URL || "http://localhost:4002";
const CART_SERVICE_URL = import.meta.env.VITE_CART_SERVICE_URL || "http://localhost:4003";
const ORDER_SERVICE_URL = import.meta.env.VITE_ORDER_SERVICE_URL || "http://localhost:3000";
const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_SERVICE_URL || "http://localhost:4001";

// Fallback catalog if product-service is not running
export const FALLBACK_PRODUCTS = [
  {
    id: "prod_tech_01",
    title: "Aura Ultra Wireless Noise-Cancelling Headphones",
    category: "Electronics",
    price: 299.99,
    compare_at_price: 349.99,
    rating: 4.8,
    reviews_count: 428,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
    description: "High-fidelity spatial audio with active noise cancellation, transparency mode, and up to 40 hours of battery life on a single charge.",
    features: ["Spatial Audio", "40hr Battery", "Memory Foam Cushions", "Bluetooth 5.3"],
    stock: 45,
    is_featured: true
  },
  {
    id: "prod_tech_02",
    title: "Nova Smart Ambient Desk Lamp",
    category: "Electronics",
    price: 89.00,
    compare_at_price: 119.00,
    rating: 4.6,
    reviews_count: 182,
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80",
    description: "Minimalist architectural desk lamp featuring adjustable color temperature, circadian rhythm scheduling, and wireless charging base.",
    features: ["15W Qi Charging Base", "Touch Dimming", "Smart Assistant Sync"],
    stock: 80,
    is_featured: true
  },
  {
    id: "prod_app_01",
    title: "Merino Wool Everyday Minimalist Hoodie",
    category: "Apparel",
    price: 148.00,
    compare_at_price: 180.00,
    rating: 4.9,
    reviews_count: 612,
    image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80",
    description: "Crafted from 100% sustainably sourced extra-fine merino wool. Naturally moisture-wicking, odor-resistant, and climate-regulating.",
    features: ["100% Merino Wool", "YKK Metal Zipper", "Tailored Ergonomic Fit"],
    stock: 120,
    is_featured: true
  },
  {
    id: "prod_foot_01",
    title: "AeroStep Cloudfoam Running Sneakers",
    category: "Footwear",
    price: 135.00,
    compare_at_price: 160.00,
    rating: 4.8,
    reviews_count: 890,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
    description: "Engineered breathable mesh upper with responsive carbon-infused rebound plate for maximum energy return and all-day comfort.",
    features: ["Carbon-Plated Cushioning", "Breathable Knit Upper", "Recycled Rubber Outsole"],
    stock: 90,
    is_featured: true
  },
  {
    id: "prod_acc_01",
    title: "Voyager Top-Grain Leather Weekend Duffel",
    category: "Accessories",
    price: 240.00,
    compare_at_price: 295.00,
    rating: 4.9,
    reviews_count: 515,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
    description: "TSA-approved carry-on duffel with dedicated shoe compartment, waterproof toiletry liner, and padded 16-inch laptop sleeve.",
    features: ["Separate Shoe Compartment", "Padded Laptop Sleeve", "Brass Hardware"],
    stock: 50,
    is_featured: true
  },
  {
    id: "prod_acc_02",
    title: "Apex Chronograph Titanium Watch",
    category: "Accessories",
    price: 380.00,
    compare_at_price: 450.00,
    rating: 4.8,
    reviews_count: 142,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
    description: "Grade 5 titanium case with scratch-resistant sapphire crystal, Japanese automatic movement, and 100-meter water resistance.",
    features: ["Sapphire Crystal", "Grade 5 Titanium", "Automatic Movement"],
    stock: 25,
    is_featured: true
  },
  {
    id: "prod_home_01",
    title: "Pour-Over Precision Ceramic Coffee Set",
    category: "Home & Living",
    price: 64.00,
    compare_at_price: 80.00,
    rating: 4.7,
    reviews_count: 274,
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80",
    description: "Double-walled ceramic dripper with thermal carafe and ultra-fine stainless steel mesh filter for barista-grade extraction.",
    features: ["Thermal Borosilicate Glass", "Double-Walled Ceramic"],
    stock: 110,
    is_featured: false
  },
  {
    id: "prod_home_02",
    "title": "AromaStone Ultrasonic Essential Oil Diffuser",
    category: "Home & Living",
    price: 72.00,
    compare_at_price: 90.00,
    rating: 4.6,
    reviews_count: 195,
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80",
    description: "Hand-poured matte ceramic stone shell with whisper-quiet ultrasonic atomization and warm ambient LED ring.",
    features: ["Handcrafted Ceramic", "Up to 8 Hours Continuous Run"],
    stock: 70,
    is_featured: false
  }
];

export const api = {
  // Products
  async getProducts(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${PRODUCT_SERVICE_URL}/products?${query}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return await res.json();
    } catch (e) {
      console.warn("[API] Product service offline, using fallback products.");
      let prods = [...FALLBACK_PRODUCTS];
      if (params.category && params.category !== "All") {
        prods = prods.filter(p => p.category.toLowerCase() === params.category.toLowerCase());
      }
      if (params.search) {
        prods = prods.filter(p => p.title.toLowerCase().includes(params.search.toLowerCase()));
      }
      return { total: prods.length, products: prods };
    }
  },

  async getProduct(id) {
    try {
      const res = await fetch(`${PRODUCT_SERVICE_URL}/products/${id}`);
      if (!res.ok) throw new Error("Not found");
      return await res.json();
    } catch (e) {
      const found = FALLBACK_PRODUCTS.find(p => p.id === id);
      if (found) return found;
      throw e;
    }
  },

  // Auth
  async login(emailOrUsername, password) {
    const res = await fetch(`${AUTH_SERVICE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailOrUsername, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    return data;
  },

  async register(userData) {
    const res = await fetch(`${AUTH_SERVICE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    return data;
  },

  // Cart
  async getCart(cartId) {
    try {
      const res = await fetch(`${CART_SERVICE_URL}/cart/${cartId}`);
      if (!res.ok) throw new Error("Failed to fetch cart");
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Order & Hyperswitch Payment Intent
  async createCheckout(orderData) {
    const res = await fetch(`${ORDER_SERVICE_URL}/create-checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Checkout creation failed");
    return data;
  },

  async getOrder(orderId) {
    const res = await fetch(`${ORDER_SERVICE_URL}/orders/${orderId}`);
    return await res.json();
  },

  async simulatePayment(orderId) {
    const res = await fetch(`${ORDER_SERVICE_URL}/orders/${orderId}/simulate-payment`, {
      method: "POST"
    });
    return await res.json();
  }
};
