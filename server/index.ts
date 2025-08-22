import express, { type Request, Response, NextFunction } from "express";
import registerRoutes from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { database } from "./database";
import { startAutomaticRenewalScheduler } from "./license-utils";
import { storage } from "./storage";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware (simplified for production)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api") && process.env.NODE_ENV === 'development') {
      log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

(async () => {
  // Initialize database tables
  try {
    await database.initTables();
  } catch (error) {
    throw error;
  }

  // Register API routes
  registerRoutes(app);

  // Start automatic license renewal scheduler
  startAutomaticRenewalScheduler(storage);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  const server = app.listen(port, "0.0.0.0", () => {
    if (process.env.NODE_ENV === 'development') {
      log(`serving on port ${port}`);
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
})();
