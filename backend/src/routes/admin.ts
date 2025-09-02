import express from "express";

const router = express.Router();

// Admin routes will be implemented here
router.get("/", (req, res) => {
  res.json({ message: "Admin routes - coming soon" });
});

export default router;
