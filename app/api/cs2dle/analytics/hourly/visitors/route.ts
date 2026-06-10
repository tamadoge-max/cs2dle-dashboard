import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface HourlyVisitor {
  hour: number;
  uniqueVisitors: number;
  pageViews: number;
}

interface HourlyVisitorData {
  date: string;
  hourlyVisitors: HourlyVisitor[];
  summary: {
    totalUniqueVisitors: number;
    totalPageViews: number;
    peakHour?: {
      hour: number;
      visitors: number;
    };
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
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json(
        { success: false, message: 'Date parameter is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Parse the date
    const selectedDate = parseISO(dateParam);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    // Find the document for the selected date
    const dailyStats = await db.collection('DailyStats').findOne({ date: dateStr });

    // If no data found for this date
    if (!dailyStats || !dailyStats.visits || dailyStats.visits.length === 0) {
      const emptyHourlyVisitors: HourlyVisitor[] = [];
      for (let hour = 0; hour < 24; hour++) {
        emptyHourlyVisitors.push({
          hour,
          uniqueVisitors: 0,
          pageViews: 0
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          date: dateParam,
          hourlyVisitors: emptyHourlyVisitors,
          summary: {
            totalUniqueVisitors: 0,
            totalPageViews: 0,
            peakHour: undefined
          }
        }
      });
    }

    // Process visits to group by hour (in Amsterdam timezone)
    // Track both total visits and unique visitors per hour
    const hourlyVisitsMap = new Map<number, number>();
    const hourlyUniqueVisitorsMap = new Map<number, Set<string>>();
    const allUniqueVisitors = new Set<string>(); // Track unique visitors for entire day
    
    for (const visit of dailyStats.visits) {
      const visitDate = new Date(visit.time);
      const visitDateAmsterdam = toZonedTime(visitDate, TIMEZONE);
      const hour = visitDateAmsterdam.getHours();
      
      // Count total visits
      hourlyVisitsMap.set(hour, (hourlyVisitsMap.get(hour) || 0) + 1);
      
      // Track unique visitors per hour
      if (!hourlyUniqueVisitorsMap.has(hour)) {
        hourlyUniqueVisitorsMap.set(hour, new Set());
      }
      hourlyUniqueVisitorsMap.get(hour)!.add(visit.userId);
      
      // Track unique visitors for the entire day
      allUniqueVisitors.add(visit.userId);
    }

    // Fill in all 24 hours with data
    const hourlyVisitors: HourlyVisitor[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const pageViews = hourlyVisitsMap.get(hour) || 0;
      const uniqueVisitors = hourlyUniqueVisitorsMap.get(hour)?.size || 0;
      
      hourlyVisitors.push({
        hour,
        uniqueVisitors,
        pageViews
      });
    }

    // Find peak hour (based on unique visitors)
    const peakHour = hourlyVisitors.reduce((max, current) => 
      current.uniqueVisitors > (max?.uniqueVisitors || 0) ? current : max, 
      hourlyVisitors[0]
    );

    const hourlyVisitorData: HourlyVisitorData = {
      date: dateParam,
      hourlyVisitors,
      summary: {
        totalUniqueVisitors: allUniqueVisitors.size,
        totalPageViews: dailyStats.visits.length,
        peakHour: peakHour && peakHour.uniqueVisitors > 0 ? {
          hour: peakHour.hour,
          visitors: peakHour.uniqueVisitors
        } : undefined
      }
    };

    return NextResponse.json({
      success: true,
      data: hourlyVisitorData
    });

  } catch (error) {
    console.error('Error fetching hourly visitor data:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch hourly visitor data' 
      },
      { status: 500 }
    );
  }
}

