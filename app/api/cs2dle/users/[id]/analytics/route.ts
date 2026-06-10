import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { format, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Europe/Amsterdam';

interface DailyPlayCount {
  date: string;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
}

interface GameTypeStats {
  gameType: string;
  totalGames: number;
  gamesWon: number;
  winRate: number;
  averageScore: number;
}

interface UserAnalytics {
  userId: string;
  userName: string;
  totalGames: number;
  totalWins: number;
  overallWinRate: number;
  totalScore: number;
  averageScore: number;
  bestStreak: number;
  currentStreak: number;
  dailyPlayCount: DailyPlayCount[];
  gameTypeStats: GameTypeStats[];
  lastPlayedDate?: string;
  firstPlayedDate?: string;
  mostActiveDay: string;
  mostActiveGameType: string;
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

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Get user basic info
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(id) },
      { projection: { _id: 1, username: 1, name: 1, score: 1, bestStreak: 1, currentStreak: 1 } }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get game history for the user
    const gameHistory = await db.collection('gameHistory').find({
      userId: new ObjectId(id)
    }).sort({ createdAt: 1 }).toArray();

    if (gameHistory.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          userId: id,
          userName: user.username || user.name || 'Anonymous',
          totalGames: 0,
          totalWins: 0,
          overallWinRate: 0,
          totalScore: 0,
          averageScore: 0,
          bestStreak: 0,
          currentStreak: 0,
          dailyPlayCount: [],
          gameTypeStats: [],
          mostActiveDay: 'N/A',
          mostActiveGameType: 'N/A'
        }
      });
    }

    // Calculate basic statistics
    const totalGames = gameHistory.length;
    const totalWins = gameHistory.filter(game => game.correctGuess).length;
    const overallWinRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
    const totalScore = user.score || 0;
    const averageScore = totalGames > 0 ? totalScore / totalGames : 0;

    // Calculate streaks
    let bestStreak = user.bestStreak || 0;
    let currentStreak = user.currentStreak || 0;

    // Calculate daily play count for last 30 days (in Amsterdam timezone)
    const dailyPlayCount: DailyPlayCount[] = [];
    const nowAmsterdam = toZonedTime(new Date(), TIMEZONE);
    const todayAmsterdam = new Date(nowAmsterdam.getFullYear(), nowAmsterdam.getMonth(), nowAmsterdam.getDate());
    
    for (let i = 29; i >= 0; i--) {
      const date = subDays(todayAmsterdam, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayGames = gameHistory.filter(game => {
        const gameDate = new Date(game.createdAt);
        const gameDateAmsterdam = toZonedTime(gameDate, TIMEZONE);
        return format(gameDateAmsterdam, 'yyyy-MM-dd') === dateStr;
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

    // Calculate game type statistics
    const gameTypeMap = new Map<string, { games: any[], wins: number, totalScore: number }>();
    
    gameHistory.forEach(game => {
      const gameType = game.gameType || 'unknown';
      if (!gameTypeMap.has(gameType)) {
        gameTypeMap.set(gameType, { games: [], wins: 0, totalScore: 0 });
      }
      
      const stats = gameTypeMap.get(gameType)!;
      stats.games.push(game);
      if (game.correctGuess) stats.wins++;
      stats.totalScore += game.score || 0;
    });

    const gameTypeStats: GameTypeStats[] = Array.from(gameTypeMap.entries()).map(([gameType, stats]) => ({
      gameType,
      totalGames: stats.games.length,
      gamesWon: stats.wins,
      winRate: stats.games.length > 0 ? Math.round((stats.wins / stats.games.length) * 100 * 100) / 100 : 0,
      averageScore: stats.games.length > 0 ? Math.round((stats.totalScore / stats.games.length) * 100) / 100 : 0
    }));

    // Find most active day of week
    const dayOfWeekCount = new Map<string, number>();
    gameHistory.forEach(game => {
      const dayOfWeek = format(new Date(game.createdAt), 'EEEE');
      dayOfWeekCount.set(dayOfWeek, (dayOfWeekCount.get(dayOfWeek) || 0) + 1);
    });
    
    const mostActiveDay = Array.from(dayOfWeekCount.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    // Find most active game type
    const mostActiveGameType = gameTypeStats
      .sort((a, b) => b.totalGames - a.totalGames)[0]?.gameType || 'N/A';

    // Get first and last played dates
    const firstPlayedDate = gameHistory[0]?.createdAt;
    const lastPlayedDate = gameHistory[gameHistory.length - 1]?.createdAt;

    const userAnalytics: UserAnalytics = {
      userId: id,
      userName: user.username || user.name || 'Anonymous',
      totalGames,
      totalWins,
      overallWinRate: Math.round(overallWinRate * 100) / 100,
      totalScore,
      averageScore: Math.round(averageScore * 100) / 100,
      bestStreak,
      currentStreak,
      dailyPlayCount,
      gameTypeStats,
      lastPlayedDate,
      firstPlayedDate,
      mostActiveDay,
      mostActiveGameType
    };

    return NextResponse.json({
      success: true,
      data: userAnalytics
    });

  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch user analytics' 
      },
      { status: 500 }
    );
  }
}
