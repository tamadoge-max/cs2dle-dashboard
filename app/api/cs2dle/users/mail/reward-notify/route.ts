import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import clientPromise from "@/lib/mongodb";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import rewardNotifyMail from "@/lib/mail/reward-notify";

const sendRewardNotifyEmailSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  email: z.string().email("Invalid email address"),
  username: z.string().optional(),
  name: z.string().optional(),
  prizeId: z.string().min(1, "Prize ID is required"),
  selectedItem: z.object({
    name: z.string(),
    image: z.string(),
    price: z.number(),
  }),
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
    const validatedData = sendRewardNotifyEmailSchema.parse(body);

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db();

    // Validate ObjectId format
    if (!ObjectId.isValid(validatedData.userId)) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Invalid user ID format: ${validatedData.userId}` 
        },
        { status: 400 }
      );
    }

    // Find the user to send email to
    const user = await db.collection("users").findOne({
      _id: new ObjectId(validatedData.userId),
    });

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          message: `User not found with ID: ${validatedData.userId}` 
        },
        { status: 404 }
      );
    }

    // Check if user has crypto addresses
    const hasWallet =
      user.cryptoAddresses &&
      (user.cryptoAddresses.bitcoin ||
        user.cryptoAddresses.ethereum ||
        user.cryptoAddresses.litecoin);

    // Generate a unique tracking ID for this email
    const trackingId = `reward-notify-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create the email content
    const displayName =
      validatedData.name || validatedData.username || "Valued Player";
    const emailSubject = hasWallet
      ? "🎉 Congratulations! You won a CS2DLE reward!"
      : "🎁 You won a CS2DLE reward - Add your wallet to claim!";

    const emailHtml = rewardNotifyMail(
      displayName,
      validatedData.selectedItem,
      !!hasWallet
    );

    // Send the email
    const mailOptions = {
      from: `<${process.env.SMTP_USER}>`,
      to: validatedData.email,
      subject: emailSubject,
      html: emailHtml,
      headers: {
        "X-Tracking-ID": trackingId,
        "X-Email-Type": "reward-notify",
        "X-User-ID": validatedData.userId,
        "X-Prize-ID": validatedData.prizeId,
      },
    };

    await transporter.sendMail(mailOptions);

    // Log the email sending event in the database
    await db.collection("email_logs").insertOne({
      userId: validatedData.userId,
      email: validatedData.email,
      type: "reward-notify",
      trackingId: trackingId,
      sentAt: new Date(),
      status: "sent",
      subject: emailSubject,
      adminUserId: session.user.id,
      metadata: {
        prizeId: validatedData.prizeId,
        itemName: validatedData.selectedItem.name,
        itemPrice: validatedData.selectedItem.price,
        hasWallet: !!hasWallet,
      },
    });

    // Update the daily case email status
    await db.collection("users").updateOne(
      {
        _id: new ObjectId(validatedData.userId),
        "dailyCase.id": validatedData.prizeId,
      },
      {
        $set: {
          "dailyCase.$.emailSent": hasWallet ? "CR_Set_won" : "CR_Remind",
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Reward notification email sent successfully",
      trackingId: trackingId,
      data: {
        userId: validatedData.userId,
        email: validatedData.email,
        sentAt: new Date().toISOString(),
        emailType: hasWallet ? "CR_Set_won" : "CR_Remind",
      },
    });
  } catch (error) {
    console.error("Send reward notification email error:", error);

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
        type: "reward-notify",
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
        message: "Failed to send reward notification email",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

