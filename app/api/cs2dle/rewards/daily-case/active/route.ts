import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { toZonedTime, format } from 'date-fns-tz';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import nodemailer from 'nodemailer';
import rewardMail from '@/lib/mail/reward';
import skinRewardMail from '@/lib/mail/skin-reward';

interface DailyCase {
  id: string;
  active: boolean;
  claimData?: string;
  receivedData?: string;
  emailSent?: string;
  precase?: {
    _id?: string;
    skinId: string;
    name: string;
    description?: string;
    image?: string;
    weapon?: {
      id: string;
      weapon_id: number;
      name: string;
    };
    category?: {
      id: string;
      name: string;
    };
    pattern?: {
      id: string;
      name: string;
    };
    min_float?: number;
    max_float?: number;
    rarity?: {
      id: string;
      name: string;
      color: string;
    };
    stattrak?: boolean;
    souvenir?: boolean;
    paint_index?: string;
    probability: number;
    price?: number;
    status: 'active' | 'inactive';
    createdBy?: string;
    lastModifiedBy?: string;
    createdAt?: string;
    updatedAt?: string;
    isManual?: boolean;
  };
}

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(); 

    const body = await request.json();
    const { prizeId, newStatus, userId } = body;

    // Validate required fields
    if (!prizeId || typeof newStatus !== 'boolean' || !userId) {
      return NextResponse.json(
        { message: 'Missing required fields: prizeId, newStatus, userId' },
        { status: 400 }
      );
    }

    // Check if user exists and find the specific daily case
    const existingUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!existingUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Find the specific daily case in the array
    const dailyCaseIndex = existingUser.dailyCase?.findIndex((case_: DailyCase) => case_.id === prizeId);
    if (dailyCaseIndex === -1 || dailyCaseIndex === undefined) {
      return NextResponse.json(
        { message: 'Prize not found for this user' },
        { status: 404 }
      );
    }

    // Check if trying to deactivate an already inactive prize
    const currentCase = existingUser.dailyCase[dailyCaseIndex];
    if (!currentCase.active && !newStatus) {
      return NextResponse.json(
        { message: 'Prize is already inactive' },
        { status: 400 }
      );
    }

    const amsterdamDate = toZonedTime(new Date(), 'Europe/Amsterdam');
    const today = format(amsterdamDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", { timeZone: 'Europe/Amsterdam' });

    // Update the specific daily case in the array using arrayFilters for precise targeting
    const result = await db.collection('users').findOneAndUpdate(
      { 
        _id: new ObjectId(userId)
      },
      { 
        $set: {
          "dailyCase.$[elem].active": newStatus,
          "dailyCase.$[elem].receivedData": today,
          "dailyCase.$[elem].emailSent": "Delivered"
        }
      },
      { 
        arrayFilters: [{ "elem.id": prizeId }],
        returnDocument: 'after'
      }
    );

    // Check if the update was successful
    if (!result) {
      console.error(`Failed to update: User ${userId} not found`);
      return NextResponse.json(
        { message: 'Failed to update user - user not found' },
        { status: 404 }
      );
    }

    const updatedUser = result;
    
    // Verify the update by finding the updated case
    const updatedCaseIndex = updatedUser.dailyCase?.findIndex((case_: DailyCase) => case_.id === prizeId);
    const updatedCase = updatedCaseIndex !== -1 ? updatedUser.dailyCase?.[updatedCaseIndex] : null;

    // Send reward delivery email if prize is being delivered
    if (newStatus && updatedCase) {
      try {
        const displayName = existingUser.name || existingUser.username || "Valued Player";
        const emailSubject = "🎁 You unboxed a reward!";
        
        // Fetch the actual skin information from the precases collection
        const precaseId = currentCase.id;
        
        if (!precaseId) {
          console.error('No precase ID found for daily case');
          throw new Error('No precase ID found');
        }

        const precaseData = await db.collection('precases').findOne({ 
          $or: [
            { _id: new ObjectId(precaseId) },
            { skinId: precaseId }
          ]
        });

        if (!precaseData) {
          console.error(`Precase not found with ID: ${precaseId}`);
          throw new Error('Precase not found');
        }

        // Get the skin information from the precases collection
        const skinItem = {
          name: precaseData.name || "Unknown Skin",
          image: precaseData.image || "https://cs2dle.net/images/skins/decoy-grenade.png",
          price: precaseData.price || 0
        };
        
        const emailHtml = skinRewardMail(displayName, skinItem);

        // Generate a unique tracking ID for this email
        const trackingId = `reward-delivery-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        const mailOptions = {
          from: `<${process.env.SMTP_USER}>`,
          to: existingUser.email,
          subject: emailSubject,
          html: emailHtml,
          headers: {
            "X-Tracking-ID": trackingId,
            "X-Email-Type": "reward-delivery",
            "X-User-ID": userId,
          },
        };

        await transporter.sendMail(mailOptions);

        // Log the email sending event in the database
        await db.collection("email_logs").insertOne({
          userId: userId,
          email: existingUser.email,
          type: "reward-delivery",
          trackingId: trackingId,
          sentAt: new Date(),
          status: "sent",
          subject: emailSubject,
          prizeId: prizeId,
        });

        console.log(`Reward delivery email sent to ${existingUser.email} for prize ${prizeId}`);
      } catch (emailError) {
        console.error('Error sending reward delivery email:', emailError);
        
        // Log the email error in the database
        try {
          await db.collection("email_logs").insertOne({
            userId: userId,
            email: existingUser.email,
            type: "reward-delivery",
            sentAt: new Date(),
            status: "failed",
            error: emailError instanceof Error ? emailError.message : "Unknown error",
            prizeId: prizeId,
          });
        } catch (logError) {
          console.error("Failed to log email error:", logError);
        }
      }
    }

    return NextResponse.json({
      message: 'Status updated successfully',
      updated: true,
      dailyCase: updatedCase,
      debug: {
        userId,
        prizeId,
        newStatus,
        beforeActive: currentCase.active,
        afterActive: updatedCase?.active,
        beforeReceivedData: currentCase.receivedData,
        afterReceivedData: updatedCase?.receivedData
      }
    });

  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json(
      { message: 'Failed to update status' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  // Alias for POST method - allows both POST and PATCH
  return POST(request);
}
