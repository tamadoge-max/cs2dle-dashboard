import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { subDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Europe/Amsterdam';

interface AnalyticsSummary {
  totalGames: number;
  totalUsers: number;
  totalVisitors: number;
  totalPlayers: number;
  averageGamesPerDay: number;
  averageUsersPerDay: number;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Get total games played
    const totalGames = await db.collection('gameHistory').countDocuments();

    // Get total users registered
    const totalUsers = await db.collection('users').countDocuments();

    // Get total unique visitors
    const totalVisitorsResult = await db.collection('DailyStats').aggregate([
      { $group: { _id: null, total: { $sum: '$visitorCount' } } }
    ]).toArray();
    const totalVisitors = totalVisitorsResult[0]?.total || 0;

    // Get total unique players (users who have played at least one game)
    const uniquePlayersResult = await db.collection('gameHistory').aggregate([
      {
        $match: {
          userId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: "$userId"
        }
      },
      {
        $count: "totalPlayers"
      }
    ]).toArray();
    const totalPlayers = uniquePlayersResult[0]?.totalPlayers || 0;

    // Calculate average games per day (last 30 days in Amsterdam timezone)
    const nowAmsterdam = toZonedTime(new Date(), TIMEZONE);
    const todayAmsterdam = new Date(nowAmsterdam.getFullYear(), nowAmsterdam.getMonth(), nowAmsterdam.getDate());
    const thirtyDaysAgoAmsterdam = subDays(todayAmsterdam, 30);
    const thirtyDaysAgo = fromZonedTime(thirtyDaysAgoAmsterdam, TIMEZONE);
    
    const recentGames = await db.collection('gameHistory').countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    const averageGamesPerDay = recentGames / 30;

    // Calculate average users per day (last 30 days)
    const recentUsers = await db.collection('users').countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    const averageUsersPerDay = recentUsers / 30;

    const summary: AnalyticsSummary = {
      totalGames,
      totalUsers,
      totalVisitors,
      totalPlayers,
      averageGamesPerDay: Math.round(averageGamesPerDay * 10) / 10,
      averageUsersPerDay: Math.round(averageUsersPerDay * 10) / 10
    };

    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

