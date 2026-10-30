import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

const allowedThemes = ["light", "dark"];

router.patch("/theme", requireAuth, async (req, res, next) => {
  try {
    const theme = req.body?.theme;

    if (!allowedThemes.includes(theme)) {
      return res.status(400).json({
        message: "Invalid theme.",
      });
    }

    req.user.theme = theme;
    await req.user.save();

    return res.json({
      message: "Theme updated.",
      theme: req.user.theme,
    });
  } catch (error) {
    next(error);
  }
});

export default router;