import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import clientPromise from "@/lib/mongodb";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import cryptoSetMail from "@/lib/mail/crypto-set";

const sendCryptoSetupEmailSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  email: z.string().email("Invalid email address"),
  username: z.string().optional(),
  name: z.string().optional(),
});

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  host: "mail.privateemail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: Request) {
  let body: any = null;

  try {
    // Check if user is authenticated and has admin privileges
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    body = await request.json();
    const validatedData = sendCryptoSetupEmailSchema.parse(body);

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db("cs2dle");

    // Find the user to send email to
    const user = await db.collection("users").findOne({
      _id: new ObjectId(validatedData.userId),
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Check if user already has crypto addresses set up
    if (
      user.cryptoAddresses &&
      (user.cryptoAddresses.bitcoin || user.cryptoAddresses.ethereum)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "User already has crypto addresses configured",
        },
        { status: 400 }
      );
    }

    // Generate a unique tracking ID for this email
    const trackingId = `crypto-setup-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create the email content
    const displayName =
      validatedData.name || validatedData.username || "Valued Player";
    const emailSubject = `🚀 Set Up Your Crypto Wallet - Claim Your CS2DLE Rewards!`;

    const emailHtml = cryptoSetMail(displayName);

    // Send the email
    const mailOptions = {
      from: `<${process.env.SMTP_USER}>`,
      to: validatedData.email,
      subject: emailSubject,
      html: emailHtml,
      headers: {
        "X-Tracking-ID": trackingId,
        "X-Email-Type": "crypto-setup",
        "X-User-ID": validatedData.userId,
      },
    };

    await transporter.sendMail(mailOptions);

    // Log the email sending event in the database
    await db.collection("email_logs").insertOne({
      userId: validatedData.userId,
      email: validatedData.email,
      type: "crypto-setup",
      trackingId: trackingId,
      sentAt: new Date(),
      status: "sent",
      subject: emailSubject,
      adminUserId: session.user.id,
    });

    // Update user's last email sent timestamp
    await db.collection("users").updateOne(
      { _id: new ObjectId(validatedData.userId) },
      {
        $set: {
          lastCryptoSetupEmailSent: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Crypto setup email sent successfully",
      trackingId: trackingId,
      data: {
        userId: validatedData.userId,
        email: validatedData.email,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Send crypto setup email error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          errors: error.errors,
        },
        { status: 400 }
      );
    }

    // Log the error in the database
    try {
      const client = await clientPromise;
      const db = client.db("cs2dle");
      await db.collection("email_logs").insertOne({
        userId: body?.userId || "unknown",
        email: body?.email || "unknown",
        type: "crypto-setup",
        sentAt: new Date(),
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        adminUserId:
          (await getServerSession(authOptions))?.user?.id || "unknown",
      });
    } catch (logError) {
      console.error("Failed to log email error:", logError);
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to send crypto setup email",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
