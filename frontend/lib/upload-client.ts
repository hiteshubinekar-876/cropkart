export async function uploadImageFile(file: File, target: "products" | "auctions") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target", target);

  const response = await fetch("/api/uploads/image", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as { error?: string; imageUrl?: string };

  if (!response.ok || !data.imageUrl) {
    throw new Error(data.error ?? "Unable to upload image.");
  }

  return data.imageUrl;
}
