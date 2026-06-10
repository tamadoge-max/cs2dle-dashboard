import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface DailyCase {
  id: string;
  active: boolean;
  claimData?: string;
  receivedData?: string;
  precase?: {
    name: string;
    image?: string;
    weapon?: {
      name: string;
    };
    category?: {
      name: string;
    };
    rarity?: {
      name: string;
      color: string;
    };
    price?: number;
  };
}

interface WeeklyPrize {
  id: string;
  active: boolean;
  weekStartDate: string;
  weekEndDate: string;
  claimData?: string;
  receivedData?: string;
  weeklyPrize?: {
    name: string;
    image?: string;
    rarity?: {
      name: string;
      color: string;
    };
    price?: number;
  };
}

interface MonthlyPrize {
  id: string;
  active: boolean;
  monthStartDate: string;
  monthEndDate: string;
  claimData?: string;
  receivedData?: string;
  prizeData?: {
    name: string;
    image?: string;
  };
}

interface UserDetails {
  _id: string;
  email: string;
  name?: string;
  username?: string;
  image?: string;
  steamId?: string;
  tradeLink?: string;
  discordName?: string;
  cryptoAddresses?: {
    bitcoin?: string;
    ethereum?: string;
  };
  dailyCase?: {
    total: number;
    valuable: number;
    zeroValue: number;
  };
  weeklyPrize?: number;
  monthlyPrize?: number;
  // Game statistics
  gamesPlayed?: number;
  bestStreak?: number;
  currentStreak?: number;
  score?: number;
  ticket?: number;
  // Account info
  createdAt?: string;
  updatedAt?: string;
  role?: string;
  isGuest?: boolean;
  winRate?: number;
  emailVerified?: boolean;
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

    // Find the user by ID
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(id) 
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get counts for rewards (no need to populate full details)
    const dailyCaseCount = user.dailyCase?.length || 0;
    const weeklyPrizeCount = user.weeklyPrize?.length || 0;
    const monthlyPrizeCount = user.monthlyPrize?.length || 0;

    // Calculate daily case breakdown (need to check prices for $0 vs non-$0)
    let zeroValueCases = 0;
    let valuableCases = 0;
    
    if (user.dailyCase && user.dailyCase.length > 0) {
      for (const dailyCase of user.dailyCase) {
        if (dailyCase.id) {
          const precase = await db
            .collection('precases')
            .findOne({ _id: new ObjectId(dailyCase.id) });
          
          if (precase && (precase.price === 0 || precase.price === undefined)) {
            zeroValueCases++;
          } else {
            valuableCases++;
          }
        } else {
          // If no ID, count as zero value
          zeroValueCases++;
        }
      }
    }
    // Calculate win rate
    const gamesPlayed = user.gamesPlayed || 0;
    const tickets = user.ticket || 0;
    const winRate = gamesPlayed > 0 ? tickets / gamesPlayed : 0;

    // Build comprehensive user details
    const userDetails: UserDetails = {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      username: user.username,
      image: user.image,
      steamId: user.steamId,
      tradeLink: user.tradeLink,
      discordName: user.isServerJoin?.username ?? user.linkedAccounts?.discord?.username ?? null,
      cryptoAddresses: user.cryptoAddresses,
      dailyCase: {
        total: dailyCaseCount,
        valuable: valuableCases,
        zeroValue: zeroValueCases
      },
      weeklyPrize: weeklyPrizeCount,
      monthlyPrize: monthlyPrizeCount,
      gamesPlayed: user.gamesPlayed,
      bestStreak: user.bestStreak,
      currentStreak: user.currentStreak,
      score: user.score,
      ticket: user.ticket,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
      updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : undefined,
      role: user.role,
      isGuest: user.isGuest,
      // Add calculated fields
      winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
      // Email verification status - assume verified if user has been active
      emailVerified: user.emailVerified !== false && user.createdAt ? true : false,
    };

    return NextResponse.json({
      success: true,
      data: userDetails
    });

  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch user details' 
      },
      { status: 500 }
    );
  }
}
