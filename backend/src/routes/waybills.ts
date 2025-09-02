import express from "express";

const router = express.Router();

// Waybill management routes will be implemented here
router.get("/", (req, res) => {
  res.json({ message: "Waybills routes - coming soon" });
});

export default router;
