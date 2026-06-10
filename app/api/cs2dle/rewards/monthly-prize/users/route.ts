import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import {
  monthlyPrizeAssignedValidMail,
  monthlyPrizeAssignedInvalidMail,
  monthlyPrizeAssignedNoAddressMail,
  monthlyPrizeDeliveredMail,
} from '@/lib/mail/monthly-prize';
import { validateUserCryptoAddresses } from '@/lib/utils/crypto-validation';

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface MonthlyPrize {
  _id: ObjectId;
  name: string;
  image?: string;
  price?: number;
  monthYear: string;
  rarity?: {
    name: string;
    color: string;
  };
  status: 'active' | 'inactive';
}

/**
 * POST /api/cs2dle/rewards/monthly-prize/users
 * Assign a monthly prize to a user
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { userId, monthlyPrizeId, monthYear } = data;

    if (!userId || !monthlyPrizeId || !monthYear) {
      return NextResponse.json(
        { error: 'userId, monthlyPrizeId, and monthYear are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Verify the monthly prize exists
    const monthlyPrize = await db
      .collection('monthlyprizes')
      .findOne({ _id: new ObjectId(monthlyPrizeId) });

    if (!monthlyPrize) {
      return NextResponse.json(
        { error: 'Monthly prize not found' },
        { status: 404 }
      );
    }

    // Get the user details
    const user = await db.collection('users').findOne({
      _id: new ObjectId(userId),
    }) as {
      _id: ObjectId;
      email: string;
      name?: string;
      username?: string;
      cryptoAddresses?: {
        bitcoin?: string;
        ethereum?: string;
      };
      monthlyPrize?: Array<{
        id: string;
        monthYear: string;
        assignedAt?: string;
      }>;
    } | null;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already has a prize for this month
    const existingPrize = user.monthlyPrize?.find(
      (prize) => prize.monthYear === monthYear
    );

    if (existingPrize) {
      return NextResponse.json(
        { error: 'User already has a monthly prize for this month' },
        { status: 400 }
      );
    }

    // Assign the monthly prize to the user with prize data
    const newMonthlyPrize = {
      id: monthlyPrizeId,
      active: true,
      monthYear,
      claimData: new Date().toISOString(),
      prizeData: {
        name: monthlyPrize.name || 'Monthly Prize',
        image: monthlyPrize.image,
        price: monthlyPrize.price,
        rarity: monthlyPrize.rarity,
      },
    };

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $push: { monthlyPrize: newMonthlyPrize },
        $set: { updatedAt: new Date() },
      } as any
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Validate user's crypto addresses
    const cryptoValidation = validateUserCryptoAddresses(user.cryptoAddresses);

    // Prepare prize data for email
    const prizeData = {
      name: monthlyPrize.name || 'Monthly Prize',
      image: monthlyPrize.image,
      price: monthlyPrize.price,
    };

    // Format display name
    const displayName =
      user.name || user.username || user.email.split('@')[0] || 'Winner';

    // Determine email template based on crypto address status
    let emailHtml: string;
    let emailSubject: string;
    let emailType: string;

    if (!cryptoValidation.hasAddress) {
      // No crypto address - send email to add address
      emailHtml = monthlyPrizeAssignedNoAddressMail(
        displayName,
        prizeData,
        monthYear
      );
      emailSubject =
        '🎉 Monthly Prize Assigned - Add Your Wallet Address - CS2DLE';
      emailType = 'monthly-prize-assigned-no-address';
    } else if (!cryptoValidation.hasValidAddress) {
      // Has address but invalid - send email to update address
      emailHtml = monthlyPrizeAssignedInvalidMail(
        displayName,
        prizeData,
        monthYear
      );
      emailSubject =
        '🎉 Monthly Prize Assigned - Update Your Wallet Address - CS2DLE';
      emailType = 'monthly-prize-assigned-invalid-address';
    } else {
      // Has valid address - send confirmation email
      emailHtml = monthlyPrizeAssignedValidMail(
        displayName,
        prizeData,
        monthYear
      );
      emailSubject = '🎉 Monthly Prize Assigned - CS2DLE';
      emailType = 'monthly-prize-assigned-valid';
    }

    // Send email if user has email
    let emailSent = false;
    let emailError: any = null;
    
    if (user.email) {
      try {
        // Generate tracking ID for email
        const trackingId = crypto.randomBytes(16).toString('hex');

        const mailOptions = {
          from: `CS2DLE <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: emailSubject,
          html: emailHtml,
          headers: {
            'X-Tracking-ID': trackingId,
            'X-Email-Type': emailType,
            'X-User-ID': userId,
            'X-Prize-ID': monthlyPrizeId,
          },
        };

        await transporter.sendMail(mailOptions);

        // Log the email sending event in the database
        await db.collection('email_logs').insertOne({
          userId: userId,
          email: user.email,
          type: emailType,
          trackingId: trackingId,
          sentAt: new Date(),
          status: 'sent',
          subject: emailSubject,
          metadata: {
            monthlyPrizeId: monthlyPrizeId,
            prizeName: monthlyPrize.name,
            monthYear: monthYear,
            hasAddress: cryptoValidation.hasAddress,
            hasValidAddress: cryptoValidation.hasValidAddress,
            validationResults: cryptoValidation.validationResults,
          },
        });

        emailSent = true;
        console.log(
          `Monthly prize assignment email sent to ${user.email} for prize ${monthlyPrize.name}`
        );
      } catch (err) {
        emailError = err;
        console.error('Error sending monthly prize email:', err);
        
        // Log the failed email attempt
        try {
          await db.collection('email_logs').insertOne({
            userId: userId,
            email: user.email,
            type: emailType,
            trackingId: crypto.randomBytes(16).toString('hex'),
            sentAt: new Date(),
            status: 'failed',
            subject: emailSubject,
            error: err instanceof Error ? err.message : String(err),
            metadata: {
              monthlyPrizeId: monthlyPrizeId,
              prizeName: monthlyPrize.name,
              monthYear: monthYear,
              hasAddress: cryptoValidation.hasAddress,
              hasValidAddress: cryptoValidation.hasValidAddress,
            },
          });
        } catch (logError) {
          console.error('Error logging failed email:', logError);
        }
        // Don't fail the entire request if email fails
        // The prize was still assigned successfully
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Monthly prize assigned successfully',
      monthlyPrize: newMonthlyPrize,
      emailSent: emailSent,
      emailError: emailError ? (emailError instanceof Error ? emailError.message : String(emailError)) : null,
      cryptoValidation: {
        hasAddress: cryptoValidation.hasAddress,
        hasValidAddress: cryptoValidation.hasValidAddress,
      },
    });
  } catch (error) {
    console.error('Error assigning monthly prize:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to assign monthly prize',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cs2dle/rewards/monthly-prize/users
 * Remove a monthly prize assignment from a user
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { userId, monthYear } = data;

    if (!userId || !monthYear) {
      return NextResponse.json(
        { error: 'userId and monthYear are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Remove the monthly prize from the user
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $pull: { monthlyPrize: { monthYear: monthYear } },
        $set: { updatedAt: new Date() },
      } as any
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Monthly prize not found for this user and month' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Monthly prize removed successfully',
    });
  } catch (error) {
    console.error('Error removing monthly prize:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to remove monthly prize',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cs2dle/rewards/monthly-prize/users
 * Mark a monthly prize as delivered for a user
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { userId, monthYear } = data;

    if (!userId || !monthYear) {
      return NextResponse.json(
        { error: 'userId and monthYear are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Get user details first to fetch prize data for email
    const user = await db.collection('users').findOne({
      _id: new ObjectId(userId),
    }) as {
      _id: ObjectId;
      email: string;
      name?: string;
      username?: string;
      monthlyPrize?: Array<{
        id: string;
        monthYear: string;
        prizeData?: {
          name: string;
          image?: string;
          price?: number;
        };
      }>;
    } | null;

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find the monthly prize entry
    const monthlyPrizeEntry = user.monthlyPrize?.find(
      (prize) => prize.monthYear === monthYear
    );

    if (!monthlyPrizeEntry) {
      return NextResponse.json(
        { error: 'Monthly prize not found for this user and month' },
        { status: 404 }
      );
    }

    // Update the specific monthly prize in user's array to mark as delivered
    const result = await db.collection('users').updateOne(
      { 
        _id: new ObjectId(userId),
        'monthlyPrize.monthYear': monthYear 
      },
      { 
        $set: { 
          'monthlyPrize.$.delivered': true,
          'monthlyPrize.$.deliveredAt': new Date().toISOString(),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User or monthly prize not found' },
        { status: 404 }
      );
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Monthly prize may already be marked as delivered' },
        { status: 400 }
      );
    }

    // Prepare prize data for email
    const prizeData = {
      name: monthlyPrizeEntry.prizeData?.name || 'Monthly Prize',
      image: monthlyPrizeEntry.prizeData?.image,
      price: monthlyPrizeEntry.prizeData?.price,
    };

    // Format display name
    const displayName =
      user.name || user.username || user.email.split('@')[0] || 'Winner';

    // Generate email HTML
    const emailHtml = monthlyPrizeDeliveredMail(
      displayName,
      prizeData,
      monthYear
    );
    const emailSubject = '🎁 Monthly Prize Delivered - CS2DLE';
    const emailType = 'monthly-prize-delivered';

    // Send email if user has email
    let emailSent = false;
    let emailError: any = null;
    
    if (user.email) {
      try {
        // Generate tracking ID for email
        const trackingId = crypto.randomBytes(16).toString('hex');

        const mailOptions = {
          from: `CS2DLE <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: emailSubject,
          html: emailHtml,
          headers: {
            'X-Tracking-ID': trackingId,
            'X-Email-Type': emailType,
            'X-User-ID': userId,
            'X-Month-Year': monthYear,
          },
        };

        await transporter.sendMail(mailOptions);

        // Log the email sending event in the database
        await db.collection('email_logs').insertOne({
          userId: userId,
          email: user.email,
          type: emailType,
          trackingId: trackingId,
          sentAt: new Date(),
          status: 'sent',
          subject: emailSubject,
          metadata: {
            monthYear: monthYear,
            prizeName: prizeData.name,
            prizePrice: prizeData.price,
          },
        });

        emailSent = true;
        console.log(
          `Monthly prize delivery email sent to ${user.email} for prize ${prizeData.name}`
        );
      } catch (err) {
        emailError = err;
        console.error('Error sending monthly prize delivery email:', err);
        
        // Log the failed email attempt
        try {
          await db.collection('email_logs').insertOne({
            userId: userId,
            email: user.email,
            type: emailType,
            trackingId: crypto.randomBytes(16).toString('hex'),
            sentAt: new Date(),
            status: 'failed',
            subject: emailSubject,
            error: err instanceof Error ? err.message : String(err),
            metadata: {
              monthYear: monthYear,
              prizeName: prizeData.name,
              prizePrice: prizeData.price,
            },
          });
        } catch (logError) {
          console.error('Error logging failed email:', logError);
        }
        // Don't fail the entire request if email fails
        // The prize was still marked as delivered successfully
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Monthly prize marked as delivered successfully',
      emailSent: emailSent,
      emailError: emailError ? (emailError instanceof Error ? emailError.message : String(emailError)) : null,
    });

  } catch (error) {
    console.error('Error marking monthly prize as delivered:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to mark monthly prize as delivered' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cs2dle/rewards/monthly-prize/users
 * Send a reminder email to a user about their monthly prize (same format as assignment email)
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { userId, monthYear } = data;

    if (!userId || !monthYear) {
      return NextResponse.json(
        { error: 'userId and monthYear are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Get user details including crypto addresses
    const user = await db.collection('users').findOne({
      _id: new ObjectId(userId),
    }) as {
      _id: ObjectId;
      email: string;
      name?: string;
      username?: string;
      cryptoAddresses?: {
        bitcoin?: string;
        ethereum?: string;
        litecoin?: string;
      };
      monthlyPrize?: Array<{
        id: string;
        monthYear: string;
        prizeData?: {
          name: string;
          image?: string;
          price?: number;
        };
        delivered?: boolean;
      }>;
    } | null;

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find the monthly prize entry
    const monthlyPrizeEntry = user.monthlyPrize?.find(
      (prize) => prize.monthYear === monthYear
    );

    if (!monthlyPrizeEntry) {
      return NextResponse.json(
        { error: 'Monthly prize not found for this user and month' },
        { status: 404 }
      );
    }

    // Check if prize is already delivered
    if (monthlyPrizeEntry.delivered) {
      return NextResponse.json(
        { error: 'Cannot send reminder for already delivered prize' },
        { status: 400 }
      );
    }

    // Get full prize details from monthlyprizes collection
    const monthlyPrize = await db
      .collection('monthlyprizes')
      .findOne({ _id: new ObjectId(monthlyPrizeEntry.id) });

    if (!monthlyPrize) {
      return NextResponse.json(
        { error: 'Monthly prize details not found' },
        { status: 404 }
      );
    }

    // Validate user's crypto addresses (same logic as assignment)
    const cryptoValidation = validateUserCryptoAddresses(user.cryptoAddresses);

    // Prepare prize data for email
    const prizeData = {
      name: monthlyPrize.name || monthlyPrizeEntry.prizeData?.name || 'Monthly Prize',
      image: monthlyPrize.image || monthlyPrizeEntry.prizeData?.image,
      price: monthlyPrize.price || monthlyPrizeEntry.prizeData?.price,
    };

    // Format display name
    const displayName =
      user.name || user.username || user.email.split('@')[0] || 'Winner';

    // Determine email template based on crypto address status (same as assignment)
    let emailHtml: string;
    let emailSubject: string;
    let emailType: string;

    if (!cryptoValidation.hasAddress) {
      // No crypto address - send email to add address
      emailHtml = monthlyPrizeAssignedNoAddressMail(
        displayName,
        prizeData,
        monthYear
      );
      emailSubject =
        '🔔 Reminder: Monthly Prize - Add Your Wallet Address - CS2DLE';
      emailType = 'monthly-prize-reminder-no-address';
    } else if (!cryptoValidation.hasValidAddress) {
      // Has address but invalid - send email to update address
      emailHtml = monthlyPrizeAssignedInvalidMail(
        displayName,
        prizeData,
        monthYear
      );
      emailSubject =
        '🔔 Reminder: Monthly Prize - Update Your Wallet Address - CS2DLE';
      emailType = 'monthly-prize-reminder-invalid-address';
    } else {
      // Has valid address - send confirmation email
      emailHtml = monthlyPrizeAssignedValidMail(
        displayName,
        prizeData,
        monthYear
      );
      emailSubject = '🔔 Reminder: Monthly Prize Assigned - CS2DLE';
      emailType = 'monthly-prize-reminder-valid';
    }

    // Send email if user has email
    let emailSent = false;
    let emailError: any = null;
    
    if (user.email) {
      try {
        // Generate tracking ID for email
        const trackingId = crypto.randomBytes(16).toString('hex');

        const mailOptions = {
          from: `CS2DLE <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: emailSubject,
          html: emailHtml,
          headers: {
            'X-Tracking-ID': trackingId,
            'X-Email-Type': emailType,
            'X-User-ID': userId,
            'X-Month-Year': monthYear,
          },
        };

        await transporter.sendMail(mailOptions);

        // Log the email sending event in the database
        await db.collection('email_logs').insertOne({
          userId: userId,
          email: user.email,
          type: emailType,
          trackingId: trackingId,
          sentAt: new Date(),
          status: 'sent',
          subject: emailSubject,
          metadata: {
            monthlyPrizeId: monthlyPrizeEntry.id,
            prizeName: prizeData.name,
            monthYear: monthYear,
            hasAddress: cryptoValidation.hasAddress,
            hasValidAddress: cryptoValidation.hasValidAddress,
            validationResults: cryptoValidation.validationResults,
          },
        });

        emailSent = true;
        console.log(
          `Monthly prize reminder email sent to ${user.email} for prize ${prizeData.name}`
        );
      } catch (err) {
        emailError = err;
        console.error('Error sending monthly prize reminder email:', err);
        
        // Log the failed email attempt
        try {
          await db.collection('email_logs').insertOne({
            userId: userId,
            email: user.email,
            type: emailType,
            trackingId: crypto.randomBytes(16).toString('hex'),
            sentAt: new Date(),
            status: 'failed',
            subject: emailSubject,
            error: err instanceof Error ? err.message : String(err),
            metadata: {
              monthlyPrizeId: monthlyPrizeEntry.id,
              prizeName: prizeData.name,
              monthYear: monthYear,
              hasAddress: cryptoValidation.hasAddress,
              hasValidAddress: cryptoValidation.hasValidAddress,
            },
          });
        } catch (logError) {
          console.error('Error logging failed email:', logError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder email sent successfully',
      emailSent: emailSent,
      emailError: emailError ? (emailError instanceof Error ? emailError.message : String(emailError)) : null,
      cryptoValidation: {
        hasAddress: cryptoValidation.hasAddress,
        hasValidAddress: cryptoValidation.hasValidAddress,
      },
    });

  } catch (error) {
    console.error('Error sending reminder email:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to send reminder email' 
      },
      { status: 500 }
    );
  }
}

