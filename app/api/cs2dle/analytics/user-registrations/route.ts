import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { format, subDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

interface DailyRegistration {
  date: string;
  count: number;
}

interface RegistrationData {
  period: string;
  dailyRegistrations: DailyRegistration[];
  summary: {
    totalUsers: number;
    averagePerDay: number;
    peakDay?: {
      date: string;
      count: number;
    };
    periodStart: string;
    periodEnd: string;
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

    // Use MongoDB aggregation pipeline to get registration stats per day
    const results = await db.collection('users').aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $exists: true, $ne: null }
        }
      },
      {
        $project: {
          date: {
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: "$createdAt",
              timezone: TIMEZONE
            }
          }
        }
      },
      {
        $group: {
          _id: "$date",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          count: 1
        }
      },
      {
        $sort: { date: 1 }
      }
    ]).toArray();

    // Create a complete date range array (fill in missing dates with 0 count)
    const dailyRegistrations: DailyRegistration[] = [];
    const dateMap = new Map<string, number>();
    
    results.forEach((result: any) => {
      dateMap.set(result.date, result.count);
    });

    // Generate all dates in range
    for (let i = daysToSubtract - 1; i >= 0; i--) {
      const date = format(subDays(nowAmsterdam, i), 'yyyy-MM-dd');
      dailyRegistrations.push({
        date,
        count: dateMap.get(date) || 0
      });
    }

    // Calculate summary statistics
    const totalUsers = dailyRegistrations.reduce((sum, day) => sum + day.count, 0);
    const averagePerDay = totalUsers / daysToSubtract;
    
    // Find peak day
    let peakDay: { date: string; count: number } | undefined;
    if (dailyRegistrations.length > 0) {
      const maxDay = dailyRegistrations.reduce((max, day) => 
        day.count > max.count ? day : max
      , dailyRegistrations[0]);
      
      if (maxDay.count > 0) {
        peakDay = {
          date: maxDay.date,
          count: maxDay.count
        };
      }
    }

    const response: RegistrationData = {
      period,
      dailyRegistrations,
      summary: {
        totalUsers,
        averagePerDay,
        peakDay,
        periodStart: format(startDateAmsterdam, 'yyyy-MM-dd'),
        periodEnd: format(nowAmsterdam, 'yyyy-MM-dd')
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error fetching user registration stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

