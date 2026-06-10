import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { format, subDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

interface DailyActivity {
  date: string;
  totalGames: number;
  activePlayers: number;
  totalWins: number;
  winRate: number;
}

interface ActivityData {
  period: string;
  dailyActivity: DailyActivity[];
  summary: {
    totalGames: number;
    totalActivePlayers: number;
    averageGamesPerDay: number;
    peakDay?: {
      date: string;
      games: number;
    };
    periodStart: string;
    periodEnd: string;
  };
}

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

    // Amsterdam timezone
    const TIMEZONE = 'Europe/Amsterdam';

    // Calculate date range based on period (in Amsterdam time)
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

    // Use MongoDB aggregation pipeline with $facet for better performance (single query)
    const results = await db.collection('gameHistory').aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $facet: {
          dailyStats: [
            {
              $project: {
                date: {
                  $dateToString: { 
                    format: "%Y-%m-%d", 
                    date: "$createdAt",
                    timezone: "Europe/Amsterdam"
                  }
                },
                userId: 1,
                correctGuess: 1
              }
            },
            {
              $group: {
                _id: "$date",
                totalGames: { $sum: 1 },
                activePlayers: { $addToSet: "$userId" },
                totalWins: {
                  $sum: { $cond: ["$correctGuess", 1, 0] }
                }
              }
            },
            {
              $project: {
                _id: 0,
                date: "$_id",
                totalGames: 1,
                activePlayers: { $size: "$activePlayers" },
                totalWins: 1,
                winRate: {
                  $multiply: [
                    { $divide: ["$totalWins", "$totalGames"] },
                    100
                  ]
                }
              }
            },
            {
              $sort: { date: 1 }
            }
          ],
          summary: [
            {
              $group: {
                _id: null,
                totalGames: { $sum: 1 },
                activePlayers: { $addToSet: "$userId" }
              }
            },
            {
              $project: {
                _id: 0,
                totalGames: 1,
                totalActivePlayers: { $size: "$activePlayers" }
              }
            }
          ]
        }
      }
    ]).toArray();

    interface DailyStatResult {
      date: string;
      totalGames: number;
      activePlayers: number;
      totalWins: number;
      winRate: number;
    }

    interface SummaryResult {
      totalGames: number;
      totalActivePlayers: number;
    }

    const aggregationResult = results[0] || { dailyStats: [], summary: [] };
    const dailyStats = aggregationResult.dailyStats as DailyStatResult[];
    const summary = (aggregationResult.summary[0] as SummaryResult) || { totalGames: 0, totalActivePlayers: 0 };

    // Create a map for quick lookup
    const statsMap = new Map(dailyStats.map((stat) => [stat.date, stat]));

    // Fill in missing days with zero values (using Amsterdam timezone)
    const dailyActivity: DailyActivity[] = [];
    for (let i = daysToFetch - 1; i >= 0; i--) {
      const date = subDays(todayAmsterdam, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayStats = statsMap.get(dateStr);
      
      dailyActivity.push({
        date: dateStr,
        totalGames: dayStats?.totalGames || 0,
        activePlayers: dayStats?.activePlayers || 0,
        totalWins: dayStats?.totalWins || 0,
        winRate: dayStats ? Math.round(dayStats.winRate * 100) / 100 : 0
      });
    }

    const averageGamesPerDay = daysToFetch > 0 ? summary.totalGames / daysToFetch : 0;
    
    // Find peak day
    const peakDay = dailyActivity.reduce((max, day) => 
      day.totalGames > (max?.totalGames || 0) ? day : max, 
      dailyActivity[0]
    );

    const activityData: ActivityData = {
      period,
      dailyActivity,
      summary: {
        totalGames: summary.totalGames,
        totalActivePlayers: summary.totalActivePlayers,
        averageGamesPerDay: Math.round(averageGamesPerDay * 100) / 100,
        peakDay: peakDay && peakDay.totalGames > 0 ? {
          date: peakDay.date,
          games: peakDay.totalGames
        } : undefined,
        periodStart: format(startDateAmsterdam, 'yyyy-MM-dd'),
        periodEnd: format(todayAmsterdam, 'yyyy-MM-dd')
      }
    };

    return NextResponse.json({
      success: true,
      data: activityData
    });

  } catch (error) {
    console.error('Error fetching activity data:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch activity data' 
      },
      { status: 500 }
    );
  }
}

