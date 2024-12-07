const express = require("express");
const cors = require("cors");
const invoiceRoutes = require("./routes/emailRoutes");
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 8080;
const allowedOrigins = [
  "http://localhost:3000",
  "https://easy-money-request-network.vercel.app/",
];

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", invoiceRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
