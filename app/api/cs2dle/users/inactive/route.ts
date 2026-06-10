import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';

interface InactiveUser {
  _id: string;
  email: string;
  name?: string;
  username?: string;
  image?: string;
  provider?: string;
  createdAt: string;
  updatedAt: string;
  daysSinceLastUpdate: number;
  gamesPlayed: number;
  bestStreak: number;
  currentStreak: number;
  ticket: number;
  score: number;
}

interface InactiveUsersResponse {
  success: boolean;
  data?: {
    users: InactiveUser[];
    totalCount: number;
    daysThreshold: number;
  };
  message?: string;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7'); // Default to 7 days
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const validDays = Math.min(365, Math.max(1, days)); // Max 1 year, min 1 day
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit)); // Max 100 items per page

    const client = await clientPromise;
    const db = client.db();

    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - validDays);

    // Get inactive users
    const users = await db.collection('users').find({
      updatedAt: { $lt: cutoffDate },
      isGuest: { $ne: true } // Exclude guest users
    })
    .sort({ updatedAt: 1 }) // Sort by oldest updatedAt first
    .skip((validPage - 1) * validLimit)
    .limit(validLimit)
    .toArray();

    // Get total count for pagination
    const totalCount = await db.collection('users').countDocuments({
      updatedAt: { $lt: cutoffDate },
      isGuest: { $ne: true }
    });

    // Transform users data
    const transformedUsers: InactiveUser[] = users.map(user => {
      const daysSinceLastUpdate = Math.floor(
        (new Date().getTime() - new Date(user.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        username: user.username,
        image: user.image,
        provider: user.provider,
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : '',
        updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : '',
        daysSinceLastUpdate,
        gamesPlayed: user.gamesPlayed || 0,
        bestStreak: user.bestStreak || 0,
        currentStreak: user.currentStreak || 0,
        ticket: user.ticket || 0,
        score: user.score || 0
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        users: transformedUsers,
        totalCount,
        daysThreshold: validDays
      }
    });

  } catch (error) {
    console.error('Error fetching inactive users:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch inactive users' 
      },
      { status: 500 }
    );
  }
}
