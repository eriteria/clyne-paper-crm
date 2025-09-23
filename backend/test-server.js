const express = require("express");
const app = express();

// Debug environment variables
console.log("Environment variables:");
console.log("PORT from env:", process.env.PORT);
console.log("NODE_ENV from env:", process.env.NODE_ENV);

const PORT = parseInt(process.env.PORT) || 8080;
console.log("Final PORT value:", PORT);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "Test server is working!",
  });
});

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "Hello from test server!" });
});

// Start server
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down...");
  server.close(() => {
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down...");
  server.close(() => {
    process.exit(0);
  });
});
