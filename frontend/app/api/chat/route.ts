import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { chatRequestSchema } from "@/lib/schemas";
import { clearChatHistory, getChatHistory, processChatMessage } from "@/lib/services/chatbot";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ messages: [] });
  }

  const messages = await getChatHistory(sessionId);
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const body = await request.json();
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid chat payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await processChatMessage({
    sessionId: parsed.data.sessionId,
    message: parsed.data.message,
    pageContext: parsed.data.pageContext,
    user: session?.user
      ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }
      : undefined,
  });

  return NextResponse.json(result, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id." }, { status: 400 });
  }

  await clearChatHistory(sessionId);
  return NextResponse.json({ message: "Chat history deleted." });
}
