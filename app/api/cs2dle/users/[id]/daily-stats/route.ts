import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { format, subDays } from 'date-fns';

interface DailyPlayCount {
  date: string;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
}

interface DailyStatsResponse {
  userId: string;
  userName: string;
  period: string;
  dailyPlayCount: DailyPlayCount[];
  summary: {
    totalGames: number;
    totalWins: number;
    averageWinRate: number;
    maxGamesInDay: number;
    mostActiveDay?: string;
    periodStart: string;
    periodEnd: string;
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // Default to 30 days

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Validate period
    const validPeriods = ['7d', '14d', '30d', 'all'];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { success: false, message: 'Invalid period. Must be one of: 7d, 14d, 30d, all' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Get user basic info
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(id) },
      { projection: { _id: 1, username: 1, name: 1 } }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate date range based on period
    const today = new Date();
    let startDate: Date;
    let daysToFetch: number;

    switch (period) {
      case '7d':
        startDate = subDays(today, 6); // 7 days including today
        daysToFetch = 7;
        break;
      case '14d':
        startDate = subDays(today, 13); // 14 days including today
        daysToFetch = 14;
        break;
      case '30d':
        startDate = subDays(today, 29); // 30 days including today
        daysToFetch = 30;
        break;
      case 'all':
        startDate = new Date(0); // All time
        daysToFetch = -1; // Special flag for all time
        break;
      default:
        startDate = subDays(today, 29);
        daysToFetch = 30;
    }

    // Build query for game history
    const query: any = {
      userId: new ObjectId(id)
    };

    if (period !== 'all') {
      query.createdAt = {
        $gte: startDate,
        $lte: today
      };
    }

    // Get game history for the user
    const gameHistory = await db.collection('gameHistory')
      .find(query)
      .sort({ createdAt: 1 })
      .toArray();

    // Calculate daily play count
    const dailyPlayCount: DailyPlayCount[] = [];
    
    if (period === 'all') {
      // For all time, group by actual dates in the data
      const dateMap = new Map<string, { games: any[], wins: number }>();
      
      gameHistory.forEach(game => {
        const gameDate = new Date(game.createdAt);
        const dateStr = format(gameDate, 'yyyy-MM-dd');
        
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, { games: [], wins: 0 });
        }
        
        const dayData = dateMap.get(dateStr)!;
        dayData.games.push(game);
        if (game.correctGuess) dayData.wins++;
      });

      // Convert to array and sort by date
      const sortedDates = Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b));
      
      sortedDates.forEach(([dateStr, dayData]) => {
        const dayWinRate = dayData.games.length > 0 ? (dayData.wins / dayData.games.length) * 100 : 0;
        dailyPlayCount.push({
          date: dateStr,
          gamesPlayed: dayData.games.length,
          gamesWon: dayData.wins,
          winRate: Math.round(dayWinRate * 100) / 100
        });
      });
    } else {
      // For specific periods, ensure all days are included
      for (let i = daysToFetch - 1; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        const dayGames = gameHistory.filter(game => {
          const gameDate = new Date(game.createdAt);
          return format(gameDate, 'yyyy-MM-dd') === dateStr;
        });
        
        const dayWins = dayGames.filter(game => game.correctGuess).length;
        const dayWinRate = dayGames.length > 0 ? (dayWins / dayGames.length) * 100 : 0;
        
        dailyPlayCount.push({
          date: dateStr,
          gamesPlayed: dayGames.length,
          gamesWon: dayWins,
          winRate: Math.round(dayWinRate * 100) / 100
        });
      }
    }

    // Calculate summary statistics
    const totalGames = dailyPlayCount.reduce((sum, item) => sum + item.gamesPlayed, 0);
    const totalWins = dailyPlayCount.reduce((sum, item) => sum + item.gamesWon, 0);
    const averageWinRate = dailyPlayCount.length > 0 ? 
      dailyPlayCount.reduce((sum, item) => sum + item.winRate, 0) / dailyPlayCount.length : 0;
    const maxGamesInDay = Math.max(...dailyPlayCount.map(item => item.gamesPlayed), 0);
    const mostActiveDay = dailyPlayCount.find(item => item.gamesPlayed === maxGamesInDay);

    const response: DailyStatsResponse = {
      userId: id,
      userName: user.username || user.name || 'Anonymous',
      period,
      dailyPlayCount,
      summary: {
        totalGames,
        totalWins,
        averageWinRate: Math.round(averageWinRate * 100) / 100,
        maxGamesInDay,
        mostActiveDay: mostActiveDay?.date,
        periodStart: dailyPlayCount.length > 0 ? dailyPlayCount[0].date : format(today, 'yyyy-MM-dd'),
        periodEnd: dailyPlayCount.length > 0 ? dailyPlayCount[dailyPlayCount.length - 1].date : format(today, 'yyyy-MM-dd')
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error fetching daily stats:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch daily stats' 
      },
      { status: 500 }
    );
  }
}
