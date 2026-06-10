import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { subDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Europe/Amsterdam';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const client = await clientPromise;
    const db = client.db();

    // Calculate date range based on period in Amsterdam timezone
    let daysToFetch = 30;
    if (period === '7d') daysToFetch = 7;
    else if (period === '14d') daysToFetch = 14;
    else if (period === '90d') daysToFetch = 90;
    else if (period === 'all') daysToFetch = 365;

    // Get current time in Amsterdam timezone
    const nowAmsterdam = toZonedTime(new Date(), TIMEZONE);
    const todayAmsterdam = new Date(nowAmsterdam.getFullYear(), nowAmsterdam.getMonth(), nowAmsterdam.getDate());
    const startDateAmsterdam = subDays(todayAmsterdam, daysToFetch);
    
    // Convert to UTC for database query
    const startDate = fromZonedTime(startDateAmsterdam, TIMEZONE);

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Fetch clicks with pagination, sorted by timestamp descending
    const clicks = await db.collection('skinsmonkeyclicks')
      .find({
        timestamp: { $gte: startDate }
      })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Format clicks for response
    const formattedClicks = clicks.map(click => ({
      _id: click._id.toString(),
      linkUrl: click.linkUrl || '',
      sourcePage: click.sourcePage || undefined,
      userId: click.userId || '',
      isGuest: click.isGuest || false,
      userEmail: click.userEmail || undefined,
      userName: click.userName || undefined,
      timestamp: click.timestamp ? new Date(click.timestamp).toISOString() : new Date().toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: {
        clicks: formattedClicks,
        page,
        limit,
        hasMore: clicks.length === limit
      }
    });

  } catch (error) {
    console.error('Error fetching AD click details:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch AD click details' 
      },
      { status: 500 }
    );
  }
}

