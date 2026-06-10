import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { format, subDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

interface GameDailyPlayers {
  date: string;
  players: number;
}

interface GamePlayerStats {
  gameType: string;
  gameName: string;
  dailyPlayers: GameDailyPlayers[];
  summary: {
    totalUniquePlayers: number;
    averagePlayersPerDay: number;
    peakDay?: {
      date: string;
      players: number;
    };
  };
}

interface GamePlayerStatsResponse {
  period: string;
  games: GamePlayerStats[];
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

    // Use MongoDB aggregation pipeline to get player counts per game type and per day
    const results = await db.collection('gameHistory').aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          gameType: { $exists: true, $ne: null },
          userId: { $exists: true, $ne: null }
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
          userId: 1
        }
      },
      {
        $group: {
          _id: {
            gameType: "$gameType",
            date: "$date"
          },
          uniquePlayers: { $addToSet: "$userId" }
        }
      },
      {
        $project: {
          _id: 0,
          gameType: "$_id.gameType",
          date: "$_id.date",
          players: { $size: "$uniquePlayers" }
        }
      },
      {
        $sort: { gameType: 1, date: 1 }
      }
    ]).toArray();

    // Get summary stats for each game type (total unique players)
    const summaryResults = await db.collection('gameHistory').aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          gameType: { $exists: true, $ne: null },
          userId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: "$gameType",
          uniquePlayers: { $addToSet: "$userId" }
        }
      },
      {
        $project: {
          _id: 1,
          totalUniquePlayers: { $size: "$uniquePlayers" }
        }
      }
    ]).toArray();

    // Create a map of game types to summary data
    const summaryMap = new Map();
    summaryResults.forEach((summary: any) => {
      summaryMap.set(summary._id, {
        totalUniquePlayers: summary.totalUniquePlayers
      });
    });

    // Group results by game type
    const gamePlayersMap = new Map<string, GameDailyPlayers[]>();
    
    results.forEach((result: any) => {
      if (!gamePlayersMap.has(result.gameType)) {
        gamePlayersMap.set(result.gameType, []);
      }
      gamePlayersMap.get(result.gameType)!.push({
        date: result.date,
        players: result.players
      });
    });

    // Build the final response with all game types (even if they have no data)
    const games: GamePlayerStats[] = Object.keys(GAME_NAMES).map(gameType => {
      const dailyPlayers = gamePlayersMap.get(gameType) || [];
      const summary = summaryMap.get(gameType) || { totalUniquePlayers: 0 };
      
      const averagePlayersPerDay = dailyPlayers.length > 0
        ? dailyPlayers.reduce((sum, day) => sum + day.players, 0) / dailyPlayers.length
        : 0;

      // Find peak day
      let peakDay: { date: string; players: number } | undefined;
      if (dailyPlayers.length > 0) {
        const peak = dailyPlayers.reduce((max, day) => 
          day.players > max.players ? day : max
        );
        peakDay = {
          date: peak.date,
          players: peak.players
        };
      }

      return {
        gameType,
        gameName: GAME_NAMES[gameType],
        dailyPlayers,
        summary: {
          totalUniquePlayers: summary.totalUniquePlayers,
          averagePlayersPerDay,
          peakDay
        }
      };
    });

    const response: GamePlayerStatsResponse = {
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
    console.error('Error fetching game player stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

