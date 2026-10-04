import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { sellerProfileSchema } from "@/lib/schemas";
import {
  getSellerProfileByUserId,
  updateSellerProfileByUserId,
} from "@/lib/services/seller-profile";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  if (!["farmer", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Seller access only." }, { status: 403 });
  }

  const profile = await getSellerProfileByUserId(session.user.id);

  if (!profile) {
    return NextResponse.json({ error: "Seller profile not found." }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  if (!["farmer", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Seller access only." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = sellerProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the seller profile fields.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const profile = await updateSellerProfileByUserId(session.user.id, parsed.data);

  if (!profile) {
    return NextResponse.json({ error: "Seller profile not found." }, { status: 404 });
  }

  return NextResponse.json({ message: "Seller settings updated successfully.", profile });
}
