const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const rootDir = path.resolve(__dirname, "..");
const uploadsDir = path.join(rootDir, "uploads");
const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

function safeExtension(filename, mimeType) {
  const ext = path.extname(filename || "").toLowerCase();
  if (ext) return ext;
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}

async function saveUploadedFiles(files) {
  if (useBlob) return saveToVercelBlob(files);
  return saveToLocalDisk(files);
}

async function saveToLocalDisk(files) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  return files.map((file) => {
    const filename = `${Date.now()}-${crypto.randomUUID()}${safeExtension(file.originalname, file.mimetype)}`;
    fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
    return {
      src: `/uploads/${filename}`,
      alt: file.originalname.replace(/\.[^.]+$/, ""),
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype
    };
  });
}

async function saveToVercelBlob(files) {
  const { put } = await import("@vercel/blob");
  return Promise.all(
    files.map(async (file) => {
      const filename = `projects/${Date.now()}-${crypto.randomUUID()}${safeExtension(file.originalname, file.mimetype)}`;
      const blob = await put(filename, file.buffer, {
        access: "public",
        contentType: file.mimetype
      });
      return {
        src: blob.url,
        alt: file.originalname.replace(/\.[^.]+$/, ""),
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      };
    })
  );
}

module.exports = { uploadsDir, saveUploadedFiles };
