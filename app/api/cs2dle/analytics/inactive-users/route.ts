import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { format, subDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

interface DailyInactive {
  date: string;
  count: number;
}

interface InactiveUsersData {
  period: string;
  dailyInactive: DailyInactive[];
  summary: {
    totalInactive: number;
    averagePerDay: number;
    peakDay?: {
      date: string;
      count: number;
    };
    periodStart: string;
    periodEnd: string;
    inactivityThreshold: number; // days of inactivity
  };
}

const TIMEZONE = 'Europe/Amsterdam';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';
    const inactivityDays = parseInt(searchParams.get('inactivityDays') || '30'); // Users inactive for N days

    const client = await clientPromise;
    const db = client.db();

    // Calculate date range in Amsterdam timezone
    const now = new Date();
    const nowAmsterdam = toZonedTime(now, TIMEZONE);
    let daysToSubtract: number;

    switch (period) {
      case '7d':
        daysToSubtract = 7;
        break;
      case '14d':
        daysToSubtract = 14;
        break;
      case '30d':
        daysToSubtract = 30;
        break;
      case '90d':
        daysToSubtract = 90;
        break;
      case 'all':
        daysToSubtract = 365; // Cap at 365 days for performance
        break;
      default:
        daysToSubtract = 30;
    }

    const startDateAmsterdam = subDays(nowAmsterdam, daysToSubtract);
    const startDate = fromZonedTime(startDateAmsterdam, TIMEZONE);

    // Calculate the inactivity cutoff date (users who haven't been active in X days)
    const inactivityCutoff = subDays(nowAmsterdam, inactivityDays);
    const inactivityCutoffDate = fromZonedTime(inactivityCutoff, TIMEZONE);

    // Get current total inactive count (for the summary badge)
    const totalInactiveCount = await db.collection('users').countDocuments({
      updatedAt: { $lt: inactivityCutoffDate },
      isGuest: { $ne: true }
    });

    // Use aggregation to efficiently get all user update dates in one query
    // Then calculate inactive counts for each day in memory
    const allUsers = await db.collection('users').find(
      {
        updatedAt: { $exists: true, $ne: null },
        isGuest: { $ne: true }
      },
      {
        projection: { updatedAt: 1 }
      }
    ).toArray();

    // Create date array for the period and calculate inactive count for each day
    const dailyInactive: DailyInactive[] = [];
    
    for (let i = daysToSubtract - 1; i >= 0; i--) {
      const targetDate = subDays(nowAmsterdam, i);
      const targetDateStart = new Date(targetDate);
      targetDateStart.setHours(0, 0, 0, 0);
      
      // Calculate the cutoff date for this specific day
      const dayCutoff = subDays(targetDateStart, inactivityDays);
      
      // Count users inactive as of this day (in memory)
      const count = allUsers.filter(user => 
        user.updatedAt < dayCutoff
      ).length;
      
      dailyInactive.push({
        date: format(targetDate, 'yyyy-MM-dd'),
        count
      });
    }

    // Calculate summary statistics
    const totalInPeriod = dailyInactive.reduce((sum, day) => sum + day.count, 0);
    const averagePerDay = totalInPeriod / daysToSubtract;
    
    // Find peak day
    let peakDay: { date: string; count: number } | undefined;
    if (dailyInactive.length > 0) {
      const maxDay = dailyInactive.reduce((max, day) => 
        day.count > max.count ? day : max
      , dailyInactive[0]);
      
      if (maxDay.count > 0) {
        peakDay = {
          date: maxDay.date,
          count: maxDay.count
        };
      }
    }

    const response: InactiveUsersData = {
      period,
      dailyInactive,
      summary: {
        totalInactive: totalInactiveCount,
        averagePerDay,
        peakDay,
        periodStart: format(startDateAmsterdam, 'yyyy-MM-dd'),
        periodEnd: format(nowAmsterdam, 'yyyy-MM-dd'),
        inactivityThreshold: inactivityDays
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error fetching inactive users stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

