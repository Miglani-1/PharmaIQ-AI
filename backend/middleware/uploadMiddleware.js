
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const uploadDir = path.resolve("uploads");

const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Create upload directory
fs.mkdirSync(uploadDir, {
  recursive: true,
});

// Store PDFs with random filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName = `${crypto.randomUUID()}.pdf`;
    cb(null, uniqueName);
  },
});

// Initial file type validation
const fileFilter = (req, file, cb) => {
  const validMime = file.mimetype === "application/pdf";
  const validExtension =
    path.extname(file.originalname).toLowerCase() === ".pdf";

  if (!validMime || !validExtension) {
    return cb(new Error("Only PDF files are allowed"));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 3,
    fieldSize: 10 * 1024,
    parts: 4,
  },
}).single("file");

// Express middleware
export const uploadPDF = (req, res, next) => {
  upload(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          message: "PDF must be 10MB or smaller",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid file upload",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Only PDF files are allowed",
    });
  });
};
