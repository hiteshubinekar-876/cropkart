import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createAuctionSchema } from "@/lib/schemas";
import { AuctionError, createAuction, getActiveAuctions } from "@/lib/services/auctions";

export const dynamic = "force-dynamic";

export async function GET() {
  const auctions = await getActiveAuctions();
  return NextResponse.json({ auctions });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Please log in to create an auction." }, { status: 401 });
  }

  if (!["farmer", "admin"].includes(session.user.role)) {
    return NextResponse.json(
      { error: "Only farmer accounts can create auctions." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = createAuctionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid auction payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const auction = await createAuction({
      sellerUserId: session.user.id,
      sellerFarmerId: session.user.farmerId,
      sellerName: session.user.name ?? "Farmer",
      productName: parsed.data.productName,
      image: parsed.data.image,
      description: parsed.data.description,
      quantity: parsed.data.quantity,
      basePrice: parsed.data.basePrice,
      bidIncrement: parsed.data.bidIncrement,
      auctionEndTime: parsed.data.auctionEndTime,
    });

    return NextResponse.json({ auction }, { status: 201 });
  } catch (error) {
    if (error instanceof AuctionError) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Unable to create auction right now." },
      { status: 500 },
    );
  }
}
