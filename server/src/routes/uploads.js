
import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDirectory = path.resolve(__dirname, "../uploads");

fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(
        new Error("This file type is not allowed.")
      );
    }

    callback(null, true);
  },
});

router.post("/", requireAuth, (req, res) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      const status = error instanceof multer.MulterError ? 400 : 415;
      return res.status(status).json({
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "File must be 10 MB or smaller."
            : error.message || "Unable to upload file.",
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Please select a file." });
    }

    return res.status(201).json({
      attachment: {
        url: `/uploads/${req.file.filename}`,
        originalName: path.basename(req.file.originalname).slice(0, 255),
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  });
});

export default router;
