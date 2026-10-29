import { Router } from "express";
import User from "../models/User.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const search = String(req.query.search || "").trim().slice(0, 60);
    const filter = { _id: { $ne: req.user._id } };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { username: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
      ];
    }
    const users = await User.find(filter).select("_id username email").sort({ username: 1 }).limit(50).lean();
    res.json({ users: users.map((user) => ({ id: user._id.toString(), username: user.username, email: user.email })) });
  } catch (error) {
    console.error("Users error:", error);
    res.status(500).json({ message: "Could not load users." });
  }
});

export default router;