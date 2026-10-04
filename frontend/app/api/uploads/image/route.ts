import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { saveImageFile } from "@/lib/upload";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  if (!["farmer", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Seller access only." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const target = formData.get("target");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Please choose an image file." }, { status: 400 });
  }

  if (target !== "products" && target !== "auctions") {
    return NextResponse.json({ error: "Invalid upload target." }, { status: 400 });
  }

  try {
    const imageUrl = await saveImageFile(file, target);
    return NextResponse.json({ imageUrl }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to upload image." },
      { status: 400 },
    );
  }
}
