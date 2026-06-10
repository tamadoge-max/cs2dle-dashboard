import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Europe/Amsterdam';

interface TodayStats {
  newUsersToday: number;
  newUsersYesterday: number;
  userGrowthPercentage: number;
  gamesToday: number;
  gamesYesterday: number;
  gameGrowthPercentage: number;
  visitorsToday: number;
  visitorsYesterday: number;
  visitorGrowthPercentage: number;
  activePlayersToday: number;
  activePlayersYesterday: number;
  playerGrowthPercentage: number;
  averageGamesLast7Days: number;
  averageUsersLast7Days: number;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Get Amsterdam timezone dates
    const nowAmsterdam = toZonedTime(new Date(), TIMEZONE);
    const todayStartAmsterdam = startOfDay(nowAmsterdam);
    const todayEndAmsterdam = endOfDay(nowAmsterdam);
    const yesterdayStartAmsterdam = startOfDay(subDays(nowAmsterdam, 1));
    const yesterdayEndAmsterdam = endOfDay(subDays(nowAmsterdam, 1));
    const sevenDaysAgoAmsterdam = startOfDay(subDays(nowAmsterdam, 7));

    // Convert to UTC for MongoDB queries
    const todayStart = fromZonedTime(todayStartAmsterdam, TIMEZONE);
    const todayEnd = fromZonedTime(todayEndAmsterdam, TIMEZONE);
    const yesterdayStart = fromZonedTime(yesterdayStartAmsterdam, TIMEZONE);
    const yesterdayEnd = fromZonedTime(yesterdayEndAmsterdam, TIMEZONE);
    const sevenDaysAgo = fromZonedTime(sevenDaysAgoAmsterdam, TIMEZONE);

    // Get new users today
    const newUsersToday = await db.collection('users').countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });

    // Get new users yesterday
    const newUsersYesterday = await db.collection('users').countDocuments({
      createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd }
    });

    // Calculate user growth percentage
    const userGrowthPercentage = newUsersYesterday > 0 
      ? ((newUsersToday - newUsersYesterday) / newUsersYesterday) * 100 
      : newUsersToday > 0 ? 100 : 0;

    // Get games today
    const gamesToday = await db.collection('gameHistory').countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });

    // Get games yesterday
    const gamesYesterday = await db.collection('gameHistory').countDocuments({
      createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd }
    });

    // Calculate game growth percentage
    const gameGrowthPercentage = gamesYesterday > 0 
      ? ((gamesToday - gamesYesterday) / gamesYesterday) * 100 
      : gamesToday > 0 ? 100 : 0;

    // Get visitors today from DailyStats
    const todayDateStr = todayStartAmsterdam.toISOString().split('T')[0];
    const todayVisitorStats = await db.collection('DailyStats').findOne({
      date: todayDateStr
    });
    const visitorsToday = todayVisitorStats?.visitorCount || 0;

    // Get visitors yesterday
    const yesterdayDateStr = yesterdayStartAmsterdam.toISOString().split('T')[0];
    const yesterdayVisitorStats = await db.collection('DailyStats').findOne({
      date: yesterdayDateStr
    });
    const visitorsYesterday = yesterdayVisitorStats?.visitorCount || 0;

    // Calculate visitor growth percentage
    const visitorGrowthPercentage = visitorsYesterday > 0 
      ? ((visitorsToday - visitorsYesterday) / visitorsYesterday) * 100 
      : visitorsToday > 0 ? 100 : 0;

    // Get active players today (unique users who played)
    const activePlayersTodayResult = await db.collection('gameHistory').aggregate([
      {
        $match: {
          createdAt: { $gte: todayStart, $lte: todayEnd },
          userId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: "$userId"
        }
      },
      {
        $count: "total"
      }
    ]).toArray();
    const activePlayersToday = activePlayersTodayResult[0]?.total || 0;

    // Get active players yesterday
    const activePlayersYesterdayResult = await db.collection('gameHistory').aggregate([
      {
        $match: {
          createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
          userId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: "$userId"
        }
      },
      {
        $count: "total"
      }
    ]).toArray();
    const activePlayersYesterday = activePlayersYesterdayResult[0]?.total || 0;

    // Calculate player growth percentage
    const playerGrowthPercentage = activePlayersYesterday > 0 
      ? ((activePlayersToday - activePlayersYesterday) / activePlayersYesterday) * 100 
      : activePlayersToday > 0 ? 100 : 0;

    // Calculate 7-day averages
    const gamesLast7Days = await db.collection('gameHistory').countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    const averageGamesLast7Days = gamesLast7Days / 7;

    const usersLast7Days = await db.collection('users').countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    const averageUsersLast7Days = usersLast7Days / 7;

    const stats: TodayStats = {
      newUsersToday,
      newUsersYesterday,
      userGrowthPercentage: Math.round(userGrowthPercentage * 10) / 10,
      gamesToday,
      gamesYesterday,
      gameGrowthPercentage: Math.round(gameGrowthPercentage * 10) / 10,
      visitorsToday,
      visitorsYesterday,
      visitorGrowthPercentage: Math.round(visitorGrowthPercentage * 10) / 10,
      activePlayersToday,
      activePlayersYesterday,
      playerGrowthPercentage: Math.round(playerGrowthPercentage * 10) / 10,
      averageGamesLast7Days: Math.round(averageGamesLast7Days * 10) / 10,
      averageUsersLast7Days: Math.round(averageUsersLast7Days * 10) / 10
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching today analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

