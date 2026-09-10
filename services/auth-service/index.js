const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-jwt-secret-replace-in-production";

// In-memory user store fallback if PostgreSQL is not connected
const inMemoryUsers = new Map();
const inMemoryAddresses = new Map();

let dbPool = null;
if (process.env.DATABASE_URL) {
  dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
  });
  console.log("Connected to PostgreSQL for user credential storage.");
} else {
  console.warn("WARNING: DATABASE_URL not set. Storing users in in-memory store for development.");
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
};

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "auth-service" });
});

// Register New User
app.post("/register", async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }

    // 1. Password is salted & hashed (NEVER stored plaintext)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    if (dbPool) {
      const existingUser = await dbPool.query(
        "SELECT id FROM users WHERE email = $1 OR username = $2",
        [email.toLowerCase(), username.toLowerCase()]
      );
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: "User with this email or username already exists" });
      }

      const insertResult = await dbPool.query(
        `INSERT INTO users (username, email, password_hash, first_name, last_name)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, first_name, last_name, created_at`,
        [username.toLowerCase(), email.toLowerCase(), passwordHash, firstName || "", lastName || ""]
      );
      const user = insertResult.rows[0];
      const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
      return res.status(201).json({ message: "User registered successfully", user, token });
    } else {
      // In-memory fallback
      const emailKey = email.toLowerCase();
      if (inMemoryUsers.has(emailKey)) {
        return res.status(409).json({ error: "User already exists" });
      }
      const user = {
        id: inMemoryUsers.size + 1,
        username,
        email: emailKey,
        password_hash: passwordHash, // stored as bcrypt hash
        first_name: firstName || "",
        last_name: lastName || "",
        created_at: new Date().toISOString()
      };
      inMemoryUsers.set(emailKey, user);
      const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
      const { password_hash, ...userProfile } = user;
      return res.status(201).json({ message: "User registered successfully", user: userProfile, token });
    }
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login User
app.post("/login", async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: "Identifier and password required" });
    }

    let user = null;
    if (dbPool) {
      const result = await dbPool.query(
        "SELECT * FROM users WHERE email = $1 OR username = $1",
        [emailOrUsername.toLowerCase()]
      );
      user = result.rows[0];
    } else {
      for (const u of inMemoryUsers.values()) {
        if (u.email === emailOrUsername.toLowerCase() || u.username === emailOrUsername.toLowerCase()) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare provided password with stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password_hash, ...userProfile } = user;
    res.json({ message: "Login successful", user: userProfile, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Get Current User Profile
app.get("/me", authenticateToken, async (req, res) => {
  try {
    if (dbPool) {
      const result = await dbPool.query(
        "SELECT id, username, email, first_name, last_name, phone, created_at FROM users WHERE id = $1",
        [req.user.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
      res.json({ user: result.rows[0] });
    } else {
      for (const u of inMemoryUsers.values()) {
        if (u.id === req.user.id) {
          const { password_hash, ...profile } = u;
          return res.json({ user: profile });
        }
      }
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Save or List User Addresses
app.get("/addresses", authenticateToken, async (req, res) => {
  if (dbPool) {
    const result = await dbPool.query("SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC", [req.user.id]);
    res.json({ addresses: result.rows });
  } else {
    const addresses = inMemoryAddresses.get(req.user.id) || [];
    res.json({ addresses });
  }
});

app.post("/addresses", authenticateToken, async (req, res) => {
  const { street_line1, street_line2, city, state, postal_code, country, is_default } = req.body;
  if (!street_line1 || !city || !state || !postal_code) {
    return res.status(400).json({ error: "Missing required address fields" });
  }

  if (dbPool) {
    const result = await dbPool.query(
      `INSERT INTO user_addresses (user_id, street_line1, street_line2, city, state, postal_code, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, street_line1, street_line2 || "", city, state, postal_code, country || "US", !!is_default]
    );
    res.status(201).json({ address: result.rows[0] });
  } else {
    const addresses = inMemoryAddresses.get(req.user.id) || [];
    const newAddress = {
      id: addresses.length + 1,
      user_id: req.user.id,
      street_line1,
      street_line2: street_line2 || "",
      city,
      state,
      postal_code,
      country: country || "US",
      is_default: !!is_default
    };
    addresses.push(newAddress);
    inMemoryAddresses.set(req.user.id, addresses);
    res.status(201).json({ address: newAddress });
  }
});

app.listen(PORT, () => {
  console.log(`Auth Service listening on port ${PORT}`);
});
