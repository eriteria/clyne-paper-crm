import express from "express";

const router = express.Router();

// Region management routes will be implemented here
router.get("/", (req, res) => {
  res.json({ message: "Regions routes - coming soon" });
});

export default router;
