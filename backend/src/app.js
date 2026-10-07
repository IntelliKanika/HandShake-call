import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import connectToSocket from "./controllers/socketManager.js";
import userRoutes from "./routes/user.routes.js";

const app = express();
const server = createServer(app);
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map((origin) => origin.trim())
    : "*";

connectToSocket(server);

app.set("port", Number(process.env.PORT || 8000));
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.get("/health", (_req, res) => {
    const databaseConnected = mongoose.connection.readyState === 1;
    return res.status(databaseConnected ? 200 : 503).json({
        status: databaseConnected ? "ok" : "degraded",
        database: databaseConnected ? "connected" : "disconnected"
    });
});

app.get("/home", (_req, res) => res.json({ hello: "world" }));
app.use("/api/v1/users", userRoutes);

server.listen(app.get("port"), () => {
    console.log(`Backend listening on port ${app.get("port")}`);
});

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
    console.error("[STARTUP] MONGODB_URI is not set; database-backed routes are unavailable.");
} else if (!/^mongodb(?:\+srv)?:\/\//.test(mongoUri)) {
    console.error("[STARTUP] MONGODB_URI must start with mongodb:// or mongodb+srv://.");
} else {
    mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 })
        .then((connection) => {
            console.log(`MongoDB connected: ${connection.connection.host}`);
        })
        .catch((error) => {
            console.error(`[STARTUP] MongoDB connection failed (${error.name}). Check MONGODB_URI, Atlas DNS, network access, and database credentials.`);
        });
}
