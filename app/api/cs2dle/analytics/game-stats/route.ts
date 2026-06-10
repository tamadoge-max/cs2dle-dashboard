import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { format, subDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

interface GameDailyStats {
  date: string;
  plays: number;
  wins: number;
  winRate: number;
}

interface GameStats {
  gameType: string;
  gameName: string;
  dailyStats: GameDailyStats[];
  summary: {
    totalPlays: number;
    totalWins: number;
    averageWinRate: number;
    averagePlaysPerDay: number;
  };
}

interface GameStatsResponse {
  period: string;
  games: GameStats[];
  periodStart: string;
  periodEnd: string;
}

const TIMEZONE = 'Europe/Amsterdam';

// Map game types to display names
const GAME_NAMES: { [key: string]: string } = {
  'GuessSkin': 'Guess the Skin',
  'EmojiPuzzle': 'Emoji Puzzle',
  'GuessPrice': 'Guess the Price',
  'HigherLower': 'Higher or Lower',
  'Wordle': 'Wordle'
};

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

    // Use MongoDB aggregation pipeline to get stats per game type and per day
    const results = await db.collection('gameHistory').aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          gameType: { $exists: true, $ne: null }
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
          },
          gameType: 1,
          correctGuess: 1
        }
      },
      {
        $group: {
          _id: {
            gameType: "$gameType",
            date: "$date"
          },
          plays: { $sum: 1 },
          wins: {
            $sum: { $cond: ["$correctGuess", 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          gameType: "$_id.gameType",
          date: "$_id.date",
          plays: 1,
          wins: 1,
          winRate: {
            $cond: [
              { $eq: ["$plays", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$wins", "$plays"] },
                  100
                ]
              }
            ]
          }
        }
      },
      {
        $sort: { gameType: 1, date: 1 }
      }
    ]).toArray();

    // Get summary stats for each game type
    const summaryResults = await db.collection('gameHistory').aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          gameType: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: "$gameType",
          totalPlays: { $sum: 1 },
          totalWins: {
            $sum: { $cond: ["$correctGuess", 1, 0] }
          }
        }
      }
    ]).toArray();

    // Create a map of game types to summary data
    const summaryMap = new Map();
    summaryResults.forEach((summary: any) => {
      summaryMap.set(summary._id, {
        totalPlays: summary.totalPlays,
        totalWins: summary.totalWins
      });
    });

    // Group results by game type
    const gameStatsMap = new Map<string, GameDailyStats[]>();
    
    results.forEach((result: any) => {
      if (!gameStatsMap.has(result.gameType)) {
        gameStatsMap.set(result.gameType, []);
      }
      gameStatsMap.get(result.gameType)!.push({
        date: result.date,
        plays: result.plays,
        wins: result.wins,
        winRate: result.winRate
      });
    });

    // Build the final response with all game types (even if they have no data)
    const games: GameStats[] = Object.keys(GAME_NAMES).map(gameType => {
      const dailyStats = gameStatsMap.get(gameType) || [];
      const summary = summaryMap.get(gameType) || { totalPlays: 0, totalWins: 0 };
      
      const averageWinRate = summary.totalPlays > 0 
        ? (summary.totalWins / summary.totalPlays) * 100 
        : 0;
      
      const averagePlaysPerDay = dailyStats.length > 0
        ? summary.totalPlays / daysToSubtract
        : 0;

      return {
        gameType,
        gameName: GAME_NAMES[gameType],
        dailyStats,
        summary: {
          totalPlays: summary.totalPlays,
          totalWins: summary.totalWins,
          averageWinRate,
          averagePlaysPerDay
        }
      };
    });

    const response: GameStatsResponse = {
      period,
      games,
      periodStart: format(startDateAmsterdam, 'yyyy-MM-dd'),
      periodEnd: format(nowAmsterdam, 'yyyy-MM-dd')
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error fetching game stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

