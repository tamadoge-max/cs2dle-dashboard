import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import clientPromise from "@/lib/mongodb";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import weeklyPrizeCryptoMail from "@/lib/mail/weekly-prize-crypto";
import weeklyPrizeSkinMail from "@/lib/mail/weekly-prize-skin";

const sendWeeklyPrizeEmailSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  weeklyPrizeId: z.string().min(1, "Weekly Prize ID is required"),
  deliveryType: z.enum(["crypto", "skin"], {
    required_error: "Delivery type is required",
  }),
  cryptoType: z.enum(["bitcoin", "ethereum", "litecoin"]).optional(),
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
    const validatedData = sendWeeklyPrizeEmailSchema.parse(body);

    // Validate delivery type has required data
    if (
      validatedData.deliveryType === "crypto" &&
      !validatedData.cryptoType
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Crypto type is required for crypto delivery",
        },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db("cs2dle");

    // Validate ObjectId format
    if (!ObjectId.isValid(validatedData.userId)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid user ID format: ${validatedData.userId}`,
        },
        { status: 400 }
      );
    }

    // Find the user
    const user = await db.collection("users").findOne({
      _id: new ObjectId(validatedData.userId),
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: `User not found with ID: ${validatedData.userId}`,
        },
        { status: 404 }
      );
    }

    // Find the weekly prize details
    const weeklyPrizeData = user.weeklyPrize?.find(
      (prize: any) => prize.id === validatedData.weeklyPrizeId
    );

    if (!weeklyPrizeData) {
      return NextResponse.json(
        {
          success: false,
          message: "Weekly prize not found for this user",
        },
        { status: 404 }
      );
    }

    // Validate user has required delivery information
    if (validatedData.deliveryType === "crypto") {
      const cryptoAddress =
        user.cryptoAddresses?.[validatedData.cryptoType!];
      if (!cryptoAddress) {
        return NextResponse.json(
          {
            success: false,
            message: `User does not have a ${validatedData.cryptoType} address configured`,
          },
          { status: 400 }
        );
      }
    } else if (validatedData.deliveryType === "skin") {
      if (!user.tradeLink) {
        return NextResponse.json(
          {
            success: false,
            message: "User does not have a Steam trade link configured",
          },
          { status: 400 }
        );
      }
    }

    // Generate a unique tracking ID for this email
    const trackingId = `weekly-prize-${validatedData.deliveryType}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create the email content
    const displayName = user.name || user.username || "Valued Player";
    const weeklyPrize = {
      name: weeklyPrizeData.weeklyPrize?.name || "Weekly Prize",
      image: weeklyPrizeData.weeklyPrize?.image,
      price: weeklyPrizeData.weeklyPrize?.price,
    };

    let emailSubject: string;
    let emailHtml: string;

    if (validatedData.deliveryType === "crypto") {
      emailSubject = `💰 Weekly Prize Sent to Your ${
        validatedData.cryptoType!.charAt(0).toUpperCase() +
        validatedData.cryptoType!.slice(1)
      } Wallet - CS2DLE`;
      emailHtml = weeklyPrizeCryptoMail(
        displayName,
        weeklyPrize,
        weeklyPrizeData.weekStartDate,
        weeklyPrizeData.weekEndDate,
        validatedData.cryptoType!.charAt(0).toUpperCase() +
          validatedData.cryptoType!.slice(1)
      );
    } else {
      emailSubject = "🎮 Weekly Prize Skin Sent to Your Steam - CS2DLE";
      emailHtml = weeklyPrizeSkinMail(
        displayName,
        weeklyPrize,
        weeklyPrizeData.weekStartDate,
        weeklyPrizeData.weekEndDate
      );
    }

    // Send the email
    const mailOptions = {
      from: `CS2DLE <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: emailSubject,
      html: emailHtml,
      headers: {
        "X-Tracking-ID": trackingId,
        "X-Email-Type": `weekly-prize-${validatedData.deliveryType}`,
        "X-User-ID": validatedData.userId,
        "X-Prize-ID": validatedData.weeklyPrizeId,
      },
    };

    await transporter.sendMail(mailOptions);

    // Log the email sending event in the database
    await db.collection("email_logs").insertOne({
      userId: validatedData.userId,
      email: user.email,
      type: `weekly-prize-${validatedData.deliveryType}`,
      trackingId: trackingId,
      sentAt: new Date(),
      status: "sent",
      subject: emailSubject,
      adminUserId: session.user.id,
      metadata: {
        weeklyPrizeId: validatedData.weeklyPrizeId,
        deliveryType: validatedData.deliveryType,
        cryptoType: validatedData.cryptoType,
        itemName: weeklyPrize.name,
        itemPrice: weeklyPrize.price,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Weekly prize ${validatedData.deliveryType} email sent successfully`,
      trackingId: trackingId,
      data: {
        userId: validatedData.userId,
        email: user.email,
        sentAt: new Date().toISOString(),
        deliveryType: validatedData.deliveryType,
      },
    });
  } catch (error) {
    console.error("Send weekly prize email error:", error);

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
        type: `weekly-prize-${body?.deliveryType || "unknown"}`,
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
        message: "Failed to send weekly prize email",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

