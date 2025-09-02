import express from "express";

const router = express.Router();

// Team management routes will be implemented here
router.get("/", (req, res) => {
  res.json({ message: "Teams routes - coming soon" });
});

export default router;
