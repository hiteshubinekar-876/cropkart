import { NextResponse } from "next/server";
import { getAuctionById } from "@/lib/services/auctions";

export const dynamic = "force-dynamic";

type AuctionRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: AuctionRouteProps) {
  const { id } = await params;
  const auction = await getAuctionById(id);

  if (!auction) {
    return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  }

  return NextResponse.json({ auction });
}
