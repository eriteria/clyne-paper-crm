import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { EventEmitter } from "events";

const router = express.Router();
const prisma = new PrismaClient();

// Global event emitter for real-time notifications
export const notificationEmitter = new EventEmitter();

// Store active SSE connections
const activeConnections = new Map<string, express.Response>();

/**
 * SSE endpoint for real-time notifications (Google Cloud/AWS Console style)
 * @route GET /notifications/stream
 * @access Private
 *
 * Note: EventSource doesn't support custom headers, so we accept token as query param
 */
router.get("/stream", async (req, res) => {
  try {
    // Get token from query parameter (EventSource doesn't support headers)
    const token = req.query.token as string;

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Access token required in query parameter",
      });
      return;
    }

    // Verify JWT token
    const jwt = require("jsonwebtoken");
    let decoded: { userId: string };
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
        userId: string;
      };
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        console.error("⚠️ Token expired for SSE connection:", error.expiredAt);
        res.status(401).json({
          success: false,
          error: "Token expired. Please refresh your session.",
          code: "TOKEN_EXPIRED",
        });
        return;
      }
      throw error; // Re-throw other JWT errors
    }

    // Get user details from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        error: "User account is inactive",
      });
      return;
    }

    const userId = user.id;

    console.log(`✅ SSE connection established for user: ${userId}`);

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
    res.flushHeaders(); // Ensure headers are sent immediately

    // Send initial connection event
    const connectedMsg = {
      type: "connected",
      message: "Notification stream connected",
      timestamp: new Date().toISOString(),
    };
    console.log(`📤 Sending connected message:`, connectedMsg);
    res.write(`data: ${JSON.stringify(connectedMsg)}\n\n`);
    
    // Force flush the response to ensure message is sent immediately
    if (res.flush) res.flush();

    // Store this connection
    activeConnections.set(userId, res);
    console.log(`📝 Stored connection for user ${userId}. Total connections: ${activeConnections.size}`);

    // Listen for notifications for this user
    const notificationHandler = (notification: any) => {
      console.log(`🔔 Notification event received:`, notification);
      // Send to specific user or broadcast
      if (notification.userId === userId || notification.userId === "all") {
        console.log(`✅ Sending notification to user ${userId}`);
        res.write(`data: ${JSON.stringify(notification)}\n\n`);
        if (res.flush) res.flush();
      } else {
        console.log(`⏭️ Skipping notification (not for this user: ${userId})`);
      }
    };

    notificationEmitter.on("notification", notificationHandler);
    console.log(`👂 Listening for notifications for user ${userId}`);

    // Handle client disconnect
    req.on("close", () => {
      notificationEmitter.off("notification", notificationHandler);
      activeConnections.delete(userId);
      res.end();
    });
  } catch (error: any) {
    console.error("SSE authentication error:", error);
    res.status(401).json({
      success: false,
      error: error.message || "Authentication failed",
    });
  }
});

/**
 * POST /notifications/test - Send a test notification (development only)
 */
router.post("/test", authenticate, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  
  sendNotification(
    userId,
    "info",
    "Test Notification",
    "This is a test notification to verify the SSE system is working correctly.",
    { test: true, timestamp: new Date().toISOString() }
  );
  
  res.json({
    success: true,
    message: "Test notification sent. Check your notification bell!",
  });
});

/**
 * Helper function to send notification to specific user
 */
export function sendNotification(
  userId: string,
  type: "info" | "success" | "warning" | "error" | "progress",
  title: string,
  message: string,
  data?: any
) {
  const notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type,
    title,
    message,
    data,
    timestamp: new Date().toISOString(),
    read: false,
  };
  
  console.log(`📤 Sending notification to user ${userId}:`, notification);
  notificationEmitter.emit("notification", notification);
  return notification;
}

/**
 * Helper function to update an existing notification (for progress updates)
 * This prevents notification spam by updating the same notification
 */
export function updateNotification(
  notificationId: string,
  userId: string,
  type: "info" | "success" | "warning" | "error" | "progress",
  title: string,
  message: string,
  data?: any
) {
  const notification = {
    id: notificationId, // Keep same ID to update existing notification
    userId,
    type,
    title,
    message,
    data,
    timestamp: new Date().toISOString(),
    read: false,
    isUpdate: true, // Flag to indicate this is an update
  };
  
  console.log(`🔄 Updating notification ${notificationId} for user ${userId}:`, notification);
  notificationEmitter.emit("notification", notification);
  return notification;
}

/**
 * Helper function to broadcast notification to all users
 */
export function broadcastNotification(
  type: "info" | "success" | "warning" | "error",
  title: string,
  message: string,
  data?: any
) {
  const notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: "all",
    type,
    title,
    message,
    data,
    timestamp: new Date().toISOString(),
    read: false,
  };

  notificationEmitter.emit("notification", notification);
  return notification;
}

export default router;
