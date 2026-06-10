import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { format, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface DailyVisitor {
  date: string;
  totalVisitors: number;
  uniqueVisitors: number;
}

interface VisitorData {
  period: string;
  dailyVisitors: DailyVisitor[];
  summary: {
    totalVisitors: number;
    totalPageViews: number;
    averageVisitorsPerDay: number;
    peakDay?: {
      date: string;
      visitors: number;
    };
    periodStart: string;
    periodEnd: string;
  };
}

const TIMEZONE = 'Europe/Amsterdam';

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    const client = await clientPromise;
    const db = client.db();

    // Calculate date range based on period in Amsterdam timezone
    let daysToFetch = 30;
    if (period === '7d') daysToFetch = 7;
    else if (period === '14d') daysToFetch = 14;
    else if (period === '90d') daysToFetch = 90;
    else if (period === 'all') daysToFetch = 365; // Cap at 1 year for performance

    // Get current time in Amsterdam timezone
    const nowAmsterdam = toZonedTime(new Date(), TIMEZONE);
    const todayAmsterdam = new Date(nowAmsterdam.getFullYear(), nowAmsterdam.getMonth(), nowAmsterdam.getDate());
    const startDateAmsterdam = subDays(todayAmsterdam, daysToFetch);

    // Generate array of dates to query
    const datesToQuery: string[] = [];
    for (let i = daysToFetch - 1; i >= 0; i--) {
      const date = subDays(todayAmsterdam, i);
      datesToQuery.push(format(date, 'yyyy-MM-dd'));
    }

    // Fetch all daily stats for the date range
    const dailyStats = await db.collection('DailyStats').find({
      date: { $in: datesToQuery }
    }).toArray();

    // Create a map for quick lookup and calculate unique visitors per day
    const statsMap = new Map(
      dailyStats.map((stat) => {
        // Count unique visitors for this specific day
        const uniqueVisitorsForDay = new Set<string>();
        if (stat.visits && Array.isArray(stat.visits)) {
          for (const visit of stat.visits) {
            if (visit.userId) {
              uniqueVisitorsForDay.add(visit.userId);
            }
          }
        }
        
        return [
          stat.date, 
          {
            visitorCount: stat.visitorCount || 0,
            uniqueVisitors: uniqueVisitorsForDay.size
          }
        ];
      })
    );

    // Track unique visitors across entire period
    const allUniqueVisitors = new Set<string>();
    for (const stat of dailyStats) {
      if (stat.visits && Array.isArray(stat.visits)) {
        for (const visit of stat.visits) {
          if (visit.userId) {
            allUniqueVisitors.add(visit.userId);
          }
        }
      }
    }

    // Fill in all days with data (including zeros for missing days)
    const dailyVisitors: DailyVisitor[] = [];

    for (const dateStr of datesToQuery) {
      const dayStats = statsMap.get(dateStr);
      const visitors = dayStats?.visitorCount || 0;
      const uniqueVisitors = dayStats?.uniqueVisitors || 0;

      dailyVisitors.push({
        date: dateStr,
        totalVisitors: visitors,
        uniqueVisitors: uniqueVisitors
      });
    }

    // Calculate total page views by summing all visitor counts
    const totalPageViews = dailyVisitors.reduce((sum, day) => sum + day.totalVisitors, 0);
    
    const averageVisitorsPerDay = daysToFetch > 0 ? allUniqueVisitors.size / daysToFetch : 0;

    // Find peak day based on unique visitors
    const peakDay = dailyVisitors.reduce((max, day) => 
      day.uniqueVisitors > (max?.uniqueVisitors || 0) ? day : max, 
      dailyVisitors[0]
    );

    const visitorData: VisitorData = {
      period,
      dailyVisitors,
      summary: {
        totalVisitors: allUniqueVisitors.size,
        totalPageViews: totalPageViews,
        averageVisitorsPerDay: Math.round(averageVisitorsPerDay * 100) / 100,
        peakDay: peakDay && peakDay.uniqueVisitors > 0 ? {
          date: peakDay.date,
          visitors: peakDay.uniqueVisitors
        } : undefined,
        periodStart: format(startDateAmsterdam, 'yyyy-MM-dd'),
        periodEnd: format(todayAmsterdam, 'yyyy-MM-dd')
      }
    };

    return NextResponse.json({
      success: true,
      data: visitorData
    });

  } catch (error) {
    console.error('Error fetching daily visitor data:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch daily visitor data' 
      },
      { status: 500 }
    );
  }
}

