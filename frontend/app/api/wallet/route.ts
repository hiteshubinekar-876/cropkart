import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getWalletByUserId } from "@/lib/services/wallet";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const wallet = await getWalletByUserId(session.user.id);
  return NextResponse.json({ wallet });
}
