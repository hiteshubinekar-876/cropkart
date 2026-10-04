import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { placeBidSchema } from "@/lib/schemas";
import { AuctionError, getBidHistory, placeBid } from "@/lib/services/auctions";

export const dynamic = "force-dynamic";

type AuctionBidsRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: AuctionBidsRouteProps) {
  const { id } = await params;
  try {
    const bids = await getBidHistory(id);
    return NextResponse.json({ bids });
  } catch (error) {
    if (error instanceof AuctionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Unable to load bid history." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: AuctionBidsRouteProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Please log in to place a bid." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = placeBidSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid bid payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const auction = await placeBid({
      auctionId: id,
      bidderUserId: session.user.id,
      bidderName: session.user.name ?? "Buyer",
      amount: parsed.data.amount,
      role: session.user.role,
    });

    return NextResponse.json({ auction }, { status: 201 });
  } catch (error) {
    if (error instanceof AuctionError) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: error.statusCode },
      );
    }

    return NextResponse.json({ error: "Unable to place bid right now." }, { status: 500 });
  }
}
