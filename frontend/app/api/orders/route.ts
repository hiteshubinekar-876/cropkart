import { NextRequest, NextResponse } from "next/server";
import { orders } from "@/lib/mock-data";
import { createOrder } from "@/lib/services/orders";
import { orderSchema } from "@/lib/schemas";

export async function GET() {
  return NextResponse.json({ orders });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = orderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid order payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const order = await createOrder(parsed.data);
  return NextResponse.json({ order }, { status: 201 });
}
