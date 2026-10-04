import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { orderSchema } from "@/lib/schemas";
import { createOrder } from "@/lib/services/orders";
import { placeWalletOrder } from "@/lib/services/wallet";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in to place an order." }, { status: 401 });
  }

  if (!["buyer", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Only buyers can place orders." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = orderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid order payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    let order;

    if (parsed.data.paymentMode === "Wallet") {
      order = await placeWalletOrder({
        ...parsed.data,
        userId: session.user.id,
      });
    } else if (parsed.data.paymentMode === "COD") {
      order = await createOrder({
        ...parsed.data,
        userId: session.user.id,
      });
    } else {
      return NextResponse.json(
        { error: `${parsed.data.paymentMode} payments are not available in checkout yet.` },
        { status: 400 },
      );
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not place order." },
      { status: 400 },
    );
  }
}
