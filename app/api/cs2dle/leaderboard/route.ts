import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { getCurrentMonth } from '@/lib/monthlyScores';


interface User {
  _id: ObjectId;
  name?: string;
  username?: string;
  image?: string;
  isGuest?: boolean;
  bestStreak?: number;
  gamesPlayed?: number;
  currentStreak?: number;
  score?: number;
  ticket?: number;
  monthlyPrize?: Array<{
    id: string;
    active: boolean;
    monthYear: string;
    claimData: string;
    delivered?: boolean;
    deliveredAt?: string;
    prizeData?: {
      name: string;
      image?: string;
      price?: number;
      rarity?: {
        name: string;
        color: string;
      };
    };
  }>;
}

interface MonthlyScoreSummary {
  _id?: ObjectId;
  userId: ObjectId;
  month: string;
  totalScoresEarned: number;
  scoresByGameType: {
    EmojiPuzzle: number;
    GuessSkin: number;
    GuessPrice: number;
    HigherLower: number;
    Wordle: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const month = searchParams.get('month'); // Optional month parameter
    
    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit)); // Max 100 items per page
    const skip = (validPage - 1) * validLimit;

    const client = await clientPromise;
    const db = client.db();

    // Get month to use (either provided or current month)
    const targetMonth = month || getCurrentMonth();

    // Fetch users from the database with ticket and gamesPlayed data
    const users = (await db
      .collection("users")
      .find({
        isGuest: { $ne: true }, // Exclude guest users
        role: { $ne: "admin" }, // Exclude admin users
        gamesPlayed: { $gt: 0 }, // Only include users who have played games
      })
      .project({
        _id: 1,
        name: 1,
        username: 1,
        image: 1,
        bestStreak: 1,
        gamesPlayed: 1,
        currentStreak: 1,
        score: 1,
        ticket: 1,
        monthlyPrize: 1,
      })
      .toArray()) as User[];

    // Fetch monthly scores for the target month
    const monthlyScores = (await db
      .collection("monthlyScores")
      .find({
        month: targetMonth,
      })
      .toArray()) as MonthlyScoreSummary[];

    // Create a map for quick lookup of monthly scores
    const monthlyScoreMap = new Map();
    monthlyScores.forEach(score => {
      monthlyScoreMap.set(score.userId.toString(), score);
    });

    // Calculate winRate for each user and sort by monthly performance
    const usersWithMonthlyData = users.map(user => {
      const tickets = user.ticket || 0;
      const gamesPlayed = user.gamesPlayed || 1; // Avoid division by zero
      const winRate = gamesPlayed > 0 ? tickets / gamesPlayed : 0;
      
      // Get monthly score for this user
      const monthlyScore = monthlyScoreMap.get(user._id.toString());
      const monthlyScoreTotal = monthlyScore?.totalScoresEarned || 0;
      
      return {
        ...user,
        winRate,
        monthlyScore: monthlyScoreTotal,
        // Calculate a combined ranking score based on monthly performance
        rankingScore: monthlyScoreTotal * 0.8 + winRate * 0.2
      };
    });

    // Sort by monthly performance (descending), then by winRate (descending), then by tickets (descending)
    const sortedUsers = usersWithMonthlyData.sort((a, b) => {
      // Primary sort: monthly score
      if (b.monthlyScore !== a.monthlyScore) {
        return b.monthlyScore - a.monthlyScore;
      }
      // Secondary sort: tickets (tiebreaker when monthly scores are equal)
      if ((b.ticket || 0) !== (a.ticket || 0)) {
        return (b.ticket || 0) - (a.ticket || 0);
      }
      // Tertiary sort: winRate
      if (b.winRate !== a.winRate) {
        return b.winRate - a.winRate;
      }
      // Quaternary sort: bestStreak
      return (b.bestStreak || 0) - (a.bestStreak || 0);
    });

    // Apply pagination to sorted users
    const paginatedUsers = sortedUsers.slice(skip, skip + validLimit);

    // Transform the data to match the expected format
    const leaderboardData = paginatedUsers.map((user, index) => {
      // Calculate winRate for display
      const tickets = user.ticket || 0;
      const gamesPlayed = user.gamesPlayed || 0;
      const winRate = gamesPlayed > 0 ? tickets / gamesPlayed : 0;

      // Find the user's monthly prize for the target month
      const currentMonthPrize = user.monthlyPrize?.find(
        prize => prize.monthYear === targetMonth
      );

      return {
        position: skip + index + 1, // Calculate global position
        user: {
          _id: user._id.toString(),
          username: user.username || user.name || "Anonymous",
          avatar: user.image || "/avatars/default.png",
        },
        bestStreak: user.bestStreak || 0,
        currentStreak: user.currentStreak || 0,
        guesses: user.gamesPlayed || 0,
        score: user.monthlyScore || 0, // Use monthly score instead of lifetime score
        tickets: tickets,
        winRate: parseFloat(winRate.toFixed(2)), // Round to 2 decimal places
        monthlyPrize: currentMonthPrize ? {
          _id: currentMonthPrize.id,
          name: currentMonthPrize.prizeData?.name || 'Unknown Prize',
          image: currentMonthPrize.prizeData?.image,
          price: currentMonthPrize.prizeData?.price,
          monthYear: currentMonthPrize.monthYear,
          rarity: currentMonthPrize.prizeData?.rarity,
          status: currentMonthPrize.active ? 'active' : 'inactive',
          delivered: currentMonthPrize.delivered || false,
          deliveredAt: currentMonthPrize.deliveredAt
        } : undefined,
      };
    });

    // Calculate pagination metadata
    const totalUsers = sortedUsers.length;
    const totalPages = Math.ceil(totalUsers / validLimit);
    const hasNextPage = validPage < totalPages;
    const hasPrevPage = validPage > 1;

    return NextResponse.json({
      success: true,
      data: leaderboardData,
      pagination: {
        page: validPage,
        limit: validLimit,
        total: totalUsers,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error("Leaderboard API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch leaderboard data",
      },
      { status: 500 }
    );
  }
}

