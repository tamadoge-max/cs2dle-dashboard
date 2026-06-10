import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

interface HourlyActivity {
  hour: number;
  totalGames: number;
  activePlayers: number;
  totalWins: number;
  winRate: number;
}

interface HourlyData {
  date: string;
  hourlyActivity: HourlyActivity[];
  summary: {
    totalGames: number;
    totalActivePlayers: number;
    peakHour?: {
      hour: number;
      games: number;
    };
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
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json(
        { success: false, message: 'Date parameter is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Amsterdam timezone
    const TIMEZONE = 'Europe/Amsterdam';

    // Parse the date and convert to Amsterdam timezone
    const selectedDate = parseISO(dateParam);
    const startDateAmsterdam = startOfDay(selectedDate);
    const endDateAmsterdam = endOfDay(selectedDate);

    // Convert to UTC for database query
    const startDateUTC = fromZonedTime(startDateAmsterdam, TIMEZONE);
    const endDateUTC = fromZonedTime(endDateAmsterdam, TIMEZONE);

    // Use MongoDB aggregation pipeline
    const results = await db.collection('gameHistory').aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDateUTC,
            $lte: endDateUTC
          }
        }
      },
      {
        $facet: {
          hourlyStats: [
            {
              $project: {
                hour: {
                  $hour: {
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
                _id: "$hour",
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
                hour: "$_id",
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
              $sort: { hour: 1 }
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

    interface HourlyStatResult {
      hour: number;
      totalGames: number;
      activePlayers: number;
      totalWins: number;
      winRate: number;
    }

    interface SummaryResult {
      totalGames: number;
      totalActivePlayers: number;
    }

    const aggregationResult = results[0] || { hourlyStats: [], summary: [] };
    const hourlyStats = aggregationResult.hourlyStats as HourlyStatResult[];
    const summary = (aggregationResult.summary[0] as SummaryResult) || { totalGames: 0, totalActivePlayers: 0 };

    // Create a map for quick lookup
    const statsMap = new Map(hourlyStats.map((stat) => [stat.hour, stat]));

    // Fill in all 24 hours with zero values for missing hours
    const hourlyActivity: HourlyActivity[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourStats = statsMap.get(hour);
      
      hourlyActivity.push({
        hour,
        totalGames: hourStats?.totalGames || 0,
        activePlayers: hourStats?.activePlayers || 0,
        totalWins: hourStats?.totalWins || 0,
        winRate: hourStats ? Math.round(hourStats.winRate * 100) / 100 : 0
      });
    }

    // Find peak hour
    const peakHour = hourlyActivity.reduce((max, current) => 
      current.totalGames > (max?.totalGames || 0) ? current : max, 
      hourlyActivity[0]
    );

    const hourlyData: HourlyData = {
      date: dateParam,
      hourlyActivity,
      summary: {
        totalGames: summary.totalGames,
        totalActivePlayers: summary.totalActivePlayers,
        peakHour: peakHour && peakHour.totalGames > 0 ? {
          hour: peakHour.hour,
          games: peakHour.totalGames
        } : undefined
      }
    };

    return NextResponse.json({
      success: true,
      data: hourlyData
    });

  } catch (error) {
    console.error('Error fetching hourly activity data:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch hourly activity data' 
      },
      { status: 500 }
    );
  }
}

