module.exports = {
  "/capi/**": {
    target: process.env.NUTRAGEA_API_TARGET || "https://localhost:7280",
    secure: false,
    changeOrigin: true,
  },
}; // Development-only self-signed certificate support.
