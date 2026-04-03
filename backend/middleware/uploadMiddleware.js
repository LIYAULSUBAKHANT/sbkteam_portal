const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadsRoot = path.join(__dirname, "..", "uploads", "task-proofs");

fs.mkdirSync(uploadsRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsRoot);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".pdf";
    const safeBaseName = path.basename(file.originalname || "proof", extension).replace(/[^a-z0-9-_]/gi, "-").slice(0, 50);
    callback(null, `${Date.now()}-${safeBaseName || "proof"}${extension}`);
  },
});

function pdfOnlyFileFilter(_req, file, callback) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const mimetype = String(file.mimetype || "").toLowerCase();
  const isPdf = extension === ".pdf" || mimetype === "application/pdf";

  if (!isPdf) {
    callback(new Error("Only PDF files are allowed."));
    return;
  }

  callback(null, true);
}

const uploadTaskProofPdf = multer({
  storage,
  fileFilter: pdfOnlyFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = { uploadTaskProofPdf };
