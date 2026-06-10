import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { format, subDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

interface DailyClick {
  date: string;
  totalClicks: number;
  totalExposures: number;
  uniqueUsers: number;
  guestClicks: number;
  registeredClicks: number;
  clickThroughRate: number;
}

interface SourcePageStats {
  sourcePage: string;
  totalClicks: number;
  uniqueUsers: number;
  percentage: number;
}

interface AdTrackingData {
  period: string;
  dailyClicks: DailyClick[];
  sourcePageStats: SourcePageStats[];
  summary: {
    totalClicks: number;
    totalExposures: number;
    clickThroughRate: number;
    uniqueUsers: number;
    guestClicks: number;
    registeredClicks: number;
    averageClicksPerDay: number;
    averageExposuresPerDay: number;
    peakDay?: {
      date: string;
      clicks: number;
      exposures?: number;
    };
    periodStart: string;
    periodEnd: string;
  };
}

const TIMEZONE = 'Europe/Amsterdam';

export async function GET(request: Request) {
  try {
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
    
    // Convert to UTC for database query
    const startDate = fromZonedTime(startDateAmsterdam, TIMEZONE);

    // Fetch all clicks in the date range
    const clicks = await db.collection('skinsmonkeyclicks').find({
      timestamp: { $gte: startDate }
    }).toArray();

    // Generate array of dates to fill
    const datesToQuery: string[] = [];
    for (let i = daysToFetch - 1; i >= 0; i--) {
      const date = subDays(todayAmsterdam, i);
      datesToQuery.push(format(date, 'yyyy-MM-dd'));
    }

    // Fetch all exposures in the date range from skinsmonkeycount collection
    const exposures = await db.collection('skinsmonkeycount').find({
      date: { $in: datesToQuery }
    }).toArray();

    // Process exposures by date
    const exposuresByDate = new Map<string, number>();
    let totalExposures = 0;
    
    for (const exposure of exposures) {
      const dateStr = exposure.date || '';
      const count = exposure.count || 0;
      
      if (datesToQuery.includes(dateStr)) {
        if (!exposuresByDate.has(dateStr)) {
          exposuresByDate.set(dateStr, 0);
        }
        exposuresByDate.set(dateStr, exposuresByDate.get(dateStr)! + count);
        totalExposures += count;
      }
    }

    // Process clicks by date
    const clicksByDate = new Map<string, {
      total: number;
      uniqueUsers: Set<string>;
      guestClicks: number;
      registeredClicks: number;
    }>();

    // Track all unique users
    const allUniqueUsers = new Set<string>();
    const sourcePageMap = new Map<string, {
      totalClicks: number;
      uniqueUsers: Set<string>;
    }>();

    for (const click of clicks) {
      const clickDate = toZonedTime(new Date(click.timestamp), TIMEZONE);
      const dateStr = format(clickDate, 'yyyy-MM-dd');

      // Initialize date entry if not exists
      if (!clicksByDate.has(dateStr)) {
        clicksByDate.set(dateStr, {
          total: 0,
          uniqueUsers: new Set(),
          guestClicks: 0,
          registeredClicks: 0
        });
      }

      const dateData = clicksByDate.get(dateStr)!;
      dateData.total += 1;

      // Track unique users
      const userId = click.userId || `guest-${click._id}`;
      dateData.uniqueUsers.add(userId);
      allUniqueUsers.add(userId);

      // Track guest vs registered
      if (click.isGuest) {
        dateData.guestClicks += 1;
      } else {
        dateData.registeredClicks += 1;
      }

      // Track by source page
      const sourcePage = click.sourcePage || 'unknown';
      if (!sourcePageMap.has(sourcePage)) {
        sourcePageMap.set(sourcePage, {
          totalClicks: 0,
          uniqueUsers: new Set()
        });
      }
      const sourceData = sourcePageMap.get(sourcePage)!;
      sourceData.totalClicks += 1;
      sourceData.uniqueUsers.add(userId);
    }

    // Build daily clicks array (fill missing dates with zeros)
    const dailyClicks: DailyClick[] = datesToQuery.map(dateStr => {
      const dateData = clicksByDate.get(dateStr);
      const dateExposures = exposuresByDate.get(dateStr) || 0;
      const dateClicks = dateData?.total || 0;
      const ctr = dateExposures > 0 ? (dateClicks / dateExposures) * 100 : 0;
      
      return {
        date: dateStr,
        totalClicks: dateClicks,
        totalExposures: dateExposures,
        uniqueUsers: dateData?.uniqueUsers.size || 0,
        guestClicks: dateData?.guestClicks || 0,
        registeredClicks: dateData?.registeredClicks || 0,
        clickThroughRate: Math.round(ctr * 100) / 100
      };
    });

    // Calculate total clicks
    const totalClicks = clicks.length;
    const guestClicks = clicks.filter(c => c.isGuest).length;
    const registeredClicks = totalClicks - guestClicks;

    // Calculate average clicks per day
    const averageClicksPerDay = daysToFetch > 0 ? totalClicks / daysToFetch : 0;
    const averageExposuresPerDay = daysToFetch > 0 ? totalExposures / daysToFetch : 0;

    // Calculate overall click-through rate
    const clickThroughRate = totalExposures > 0 ? (totalClicks / totalExposures) * 100 : 0;

    // Find peak day (by clicks)
    const peakDay = dailyClicks.reduce((max, day) => 
      day.totalClicks > (max?.totalClicks || 0) ? day : max, 
      dailyClicks[0]
    );

    // Build source page stats
    const sourcePageStats: SourcePageStats[] = Array.from(sourcePageMap.entries())
      .map(([sourcePage, data]) => ({
        sourcePage,
        totalClicks: data.totalClicks,
        uniqueUsers: data.uniqueUsers.size,
        percentage: totalClicks > 0 ? (data.totalClicks / totalClicks) * 100 : 0
      }))
      .sort((a, b) => b.totalClicks - a.totalClicks);

    const adTrackingData: AdTrackingData = {
      period,
      dailyClicks,
      sourcePageStats,
      summary: {
        totalClicks,
        totalExposures,
        clickThroughRate: Math.round(clickThroughRate * 100) / 100,
        uniqueUsers: allUniqueUsers.size,
        guestClicks,
        registeredClicks,
        averageClicksPerDay: Math.round(averageClicksPerDay * 100) / 100,
        averageExposuresPerDay: Math.round(averageExposuresPerDay * 100) / 100,
        peakDay: peakDay && peakDay.totalClicks > 0 ? {
          date: peakDay.date,
          clicks: peakDay.totalClicks,
          exposures: peakDay.totalExposures
        } : undefined,
        periodStart: format(startDateAmsterdam, 'yyyy-MM-dd'),
        periodEnd: format(todayAmsterdam, 'yyyy-MM-dd')
      }
    };

    return NextResponse.json({
      success: true,
      data: adTrackingData
    });

  } catch (error) {
    console.error('Error fetching AD tracking data:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch AD tracking data' 
      },
      { status: 500 }
    );
  }
}

