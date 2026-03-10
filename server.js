require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const useragent = require("express-useragent");
const bodyParser = require("body-parser");

const app = express();
const terminal = require("./terminal");

const PORT = process.env.PORT || 3001;

// Connect to MongoDB
async function ConnectDB() {
  try {
    terminal.info("Connecting to MongoDB...");
    const conn = await mongoose.connect(process.env.MONGO_URI);
    terminal.success(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    terminal.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
}
ConnectDB();

// CORS setup
const corsOption = {
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
};
app.use(cors(corsOption));
app.options("*", cors(corsOption));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(useragent.express());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load routes dynamically
const loadRoutes = (baseDir, baseRoute) => {
  const items = fs.readdirSync(baseDir);

  items.forEach((item) => {
    const fullPath = path.join(baseDir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (item.startsWith("[") && item.endsWith("]")) {
        const paramName = item.slice(1, -1);
        loadRoutes(fullPath, `${baseRoute}/:${paramName}`);
      } else {
        loadRoutes(fullPath, `${baseRoute}/${item}`);
      }
    } else if (item === "index.js") {
      const routeHandler = require(fullPath);

      if (
        typeof routeHandler === "function" ||
        (typeof routeHandler === "object" && routeHandler !== null)
      ) {
        const normalizedRoute = baseRoute.replace(/\/+/g, "/");
        terminal.success(`Loaded route: ${normalizedRoute}`);
        app.use(normalizedRoute, routeHandler);
      } else {
        console.error(
          `Failed to load route: ${baseRoute}. Expected a function or middleware.`
        );
      }
    }
  });
};

loadRoutes(path.join(__dirname, "router"), "/");

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "المسار غير موجود",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  terminal.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "حدث خطأ في السيرفر",
  });
});

// Start server
app.listen(PORT, () => {
  terminal.success(`Server is running on http://localhost:${PORT}`);
});
