
import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// Check admin permission
function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Only administrators can perform this action.",
    });
  }

  next();
}

// GET USERS
// Used by Find People and group creation
router.get("/", requireAuth, async (req, res) => {
  try {
    const search = String(req.query.search || "")
      .trim()
      .slice(0, 60);

    const filter = {
      _id: { $ne: req.user._id },
    };

    if (search) {
      const escaped = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.$or = [
        { username: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("_id username email role canPrivateMessage")
      .sort({ username: 1 })
      .limit(50)
      .lean();

    res.json({
      users: users.map((user) => ({
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role || "member",
        canPrivateMessage: user.canPrivateMessage === true,
      })),
    });
  } catch (error) {
    console.error("Users error:", error);

    res.status(500).json({
      message: "Could not load users.",
    });
  }
});
// UPDATE MY ACTIVE STATUS VISIBILITY
router.patch("/active-status", requireAuth, async (req, res) => {
  try {
    const { showActiveStatus } = req.body;

    if (typeof showActiveStatus !== "boolean") {
      return res.status(400).json({
        message: "Active status visibility must be true or false.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: { showActiveStatus },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("_id showActiveStatus");

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.json({
      message: "Active status visibility updated.",
      showActiveStatus: user.showActiveStatus,
    });
  } catch (error) {
    console.error("Update active status error:", error);

    return res.status(500).json({
      message: "Could not update active status.",
    });
  }
});
// GET USERS WAITING FOR PRIVATE MESSAGE APPROVAL
router.get(
  "/pending-approvals",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const users = await User.find({
        role: { $ne: "admin" },
        canPrivateMessage: { $ne: true },
      })
        .select("_id username email createdAt")
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        users: users.map((user) => ({
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
        })),
      });
    } catch (error) {
      console.error("Pending approvals error:", error);

      res.status(500).json({
        message: "Could not load pending users.",
      });
    }
  }
);

// APPROVE OR REVOKE PRIVATE MESSAGING
router.patch(
  "/:userId/private-messaging",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { approved } = req.body;

      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({
          message: "Invalid user ID.",
        });
      }

      if (typeof approved !== "boolean") {
        return res.status(400).json({
          message: "Approval must be true or false.",
        });
      }

      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          role: { $ne: "admin" },
        },
        {
          $set: {
            canPrivateMessage: approved,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).select("_id username email role canPrivateMessage");

      if (!user) {
        return res.status(404).json({
          message: "User not found or cannot be modified.",
        });
      }

      return res.json({
        message: approved
          ? "Private messaging approved successfully."
          : "Private messaging permission revoked.",
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          canPrivateMessage: user.canPrivateMessage,
        },
      });
    } catch (error) {
      console.error("Approval error:", error);

      res.status(500).json({
        message: "Could not update private messaging permission.",
      });
    }
  }
);

export default router;
