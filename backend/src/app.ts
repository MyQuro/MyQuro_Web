import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./auth/auth.js";
import { requestLogger } from "./middleware/logger.middleware.js";

// Core routes
import protectedRoutes from "./routes/protected.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import userRoutes from "./routes/user.routes.js";

// Restaurant-related routes
import restaurantRoutes from "./routes/restaurant.routes.js";
import applyRestaurantRoutes from "./routes/restaurants-apply.routes.js";
import staffInviteRoutes from "./routes/restaurant-staff.routes.js";
import staffRequestAcceptRoutes from "./routes/staff-request-accept.routes.js";
import restaurantReviewRequestRoutes from "./routes/restaurant-review-request.routes.js";

// Tables / menus / orders
import tableRoutes from "./routes/restaurant-tables.routes.js";
import menuRoutes from "./routes/menu.routes.js";
import scanQr from "./routes/qr.routes.js";
import orders from "./routes/order.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import billingRoutes from "./routes/billing.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import offersRoutes from "./routes/offers.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import restaurantAnalyticsRoutes from "./routes/restaurant-analytics.routes.js";
import reviewsRoutes from "./routes/reviews.routes.js";
import extrasRoutes from "./routes/extras.routes.js";

// Admin / reservations / notifications
import adminRoutes from "./routes/admin.routes.js";
import reservationRoutes from "./routes/reservation.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import loyaltyRoutes from "./routes/loyalty.routes.js";
import companyRoutes from "./routes/company.routes.js";
import favouriteRoutes from "./routes/favourite.routes.js";


export const app = express();

/* -------------------- Middleware -------------------- */

app.use(
  cors({
    origin: true,
    credentials: true,
    exposedHeaders: ['set-cookie'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  })
);

app.use(express.json());
app.set("trust proxy", true);

// Global request logger
app.use(requestLogger);

/* -------------------- Health & Root -------------------- */

app.get("/", (_req, res) => {
  res.json({ message: "MyQuro Backend API", status: "running" });
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    websocket: 'enabled',
    version: '1.0.0'
  });
});

/* -------------------- Auth -------------------- */

app.use("/api/auth", toNodeHandler(auth));

/* -------------------- Core APIs -------------------- */

app.use("/api/protected", protectedRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/user", userRoutes);

/*
 IMPORTANT:
 Specific restaurant routes must be registered BEFORE generic ones
 to avoid route shadowing (e.g. /view-request vs /:id)
*/
app.use("/api/restaurants", applyRestaurantRoutes, staffInviteRoutes);
app.use("/api/restaurants", restaurantRoutes);

app.use("/api/restaurant-tables", tableRoutes);
app.use("/api/staff-requests", staffRequestAcceptRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/qr", scanQr);
app.use("/api/sessions", sessionRoutes);
app.use("/api/orders", orders);
app.use("/api/billing", billingRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/offers", offersRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/analytics", restaurantAnalyticsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/extras", extrasRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/favourites", favouriteRoutes);


/* -------------------- Admin -------------------- */

app.use("/api/admin", adminRoutes);
app.use("/api/admin", restaurantReviewRequestRoutes);
