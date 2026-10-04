import path from "path";
import { mkdir, writeFile } from "fs/promises";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function getExtension(fileName: string, mimeType: string) {
  const fileExtension = path.extname(fileName).toLowerCase();

  if (fileExtension) {
    return fileExtension;
  }

  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return "";
  }
}

export function validateImageFile(file: File) {
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("Only JPG, PNG, WEBP, or GIF images are allowed.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image size must be 5 MB or less.");
  }
}

export async function saveImageFile(file: File, folder: "products" | "auctions") {
  validateImageFile(file);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const extension = getExtension(file.name, file.type);
  const fileName = `${folder}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${extension}`;
  const relativeDirectory = path.join("uploads", folder);
  const absoluteDirectory = path.join(process.cwd(), "public", relativeDirectory);
  await mkdir(absoluteDirectory, { recursive: true });

  const absoluteFilePath = path.join(absoluteDirectory, fileName);
  await writeFile(absoluteFilePath, buffer);

  return `/${relativeDirectory.replace(/\\/g, "/")}/${fileName}`;
}
