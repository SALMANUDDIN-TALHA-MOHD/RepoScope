/**
 * routes/reviews.js
 * POST /api/reviews     — submit a new review (saved to Supabase, pending moderation)
 * GET  /api/reviews     — returns approved reviews for homepage display
 */

const express = require("express");
const supabaseService = require("../services/supabaseService");

const router = express.Router();

// POST /api/reviews
router.post("/reviews", async (req, res) => {
  const { name, role, stars, text } = req.body;

  if (!name || !stars || !text) {
    return res.status(400).json({ error: "name, stars, and text are required" });
  }

  if (typeof stars !== "number" || stars < 1 || stars > 5) {
    return res.status(400).json({ error: "stars must be a number between 1 and 5" });
  }

  if (text.length > 1000) {
    return res.status(400).json({ error: "Review text must be under 1000 characters" });
  }

  try {
    const review = await supabaseService.saveReview({ name, role, stars, text });
    return res.status(201).json({ success: true, id: review.id });
  } catch (err) {
    console.error("[reviews] save error:", err.message);
    return res.status(500).json({ error: "Could not save review" });
  }
});

// GET /api/reviews
router.get("/reviews", async (req, res) => {
  try {
    const reviews = await supabaseService.getApprovedReviews();
    return res.json(reviews);
  } catch (err) {
    console.error("[reviews] fetch error:", err.message);
    return res.status(500).json({ error: "Could not fetch reviews" });
  }
});

module.exports = router;