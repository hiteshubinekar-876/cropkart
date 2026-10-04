import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { enquirySchema } from "@/lib/schemas";
import { InquiryModel } from "@/models/Inquiry";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = enquirySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please complete all required enquiry fields." },
      { status: 400 },
    );
  }

  const connection = await connectToDatabase();

  if (!connection) {
    return NextResponse.json(
      { error: "MongoDB is not configured. Add MONGODB_URI to enable enquiries." },
      { status: 500 },
    );
  }

  await InquiryModel.create({
    type: parsed.data.type,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || undefined,
    company: parsed.data.company || undefined,
    subject: parsed.data.subject || undefined,
    requirement: parsed.data.requirement,
  });

  return NextResponse.json(
    { message: "Thanks. Your enquiry has been submitted successfully." },
    { status: 201 },
  );
}
