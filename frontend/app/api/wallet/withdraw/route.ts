import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { walletAmountSchema } from "@/lib/schemas";
import { withdrawFromWallet } from "@/lib/services/wallet";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = walletAmountSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid withdrawal amount.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const wallet = await withdrawFromWallet(session.user.id, parsed.data.amount);
    return NextResponse.json({ message: "Money withdrawn successfully.", wallet });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to withdraw money." },
      { status: 400 },
    );
  }
}
