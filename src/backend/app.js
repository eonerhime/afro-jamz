import express from "express";
import authRoutes from "./routes/auth.routes.js";
import beatsRoutes from "./routes/beats.routes.js";
import producerRoutes from "./routes/producer.routes.js";
import purchasesRoutes from "./routes/purchases.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import adminFinanceRoutes from "./routes/admin-finance.routes.js";
import paymentMethodsRoutes from "./routes/payment-methods.routes.js";
import fundsRoutes from "./routes/funds.routes.js";
import walletRoutes from "./routes/wallet.routes.js";

console.log("✅ Producer routes loaded:", typeof producerRoutes);

const app = express();
app.use(express.json());

// Route handlers
app.use("/auth", authRoutes);
// Mount specific routes BEFORE parameterized routes to avoid conflicts
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminFinanceRoutes); // Admin financial management
app.use("/api/producer", producerRoutes);
app.use("/api/buyer", purchasesRoutes);
app.use("/api/buyer/payment-methods", paymentMethodsRoutes);
app.use("/api/system", fundsRoutes); // Auto-release funds endpoint
app.use("/api/wallet", walletRoutes); // Wallet balance and transactions
app.use("/api/beats", beatsRoutes); // All beats routes

export default app;
