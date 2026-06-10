import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';

interface UserStatsResponse {
  success: boolean;
  data?: {
    signupsByDate: Array<{
      date: string;
      count: number;
    }>;
    activeUsersToday: number;
    totalUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
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
    const days = parseInt(searchParams.get('days') || '30'); // Default to 30 days
    const validDays = Math.min(365, Math.max(1, days)); // Max 1 year, min 1 day

    const client = await clientPromise;
    const db = client.db();

    // Get date ranges
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - validDays);
    
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(today);
    monthStart.setMonth(monthStart.getMonth() - 1);
    monthStart.setHours(0, 0, 0, 0);

    // Get signups by date
    const signupsByDate = await db.collection('users').aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isGuest: { $ne: true } // Exclude guest users
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          date: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]).toArray();

    // Get active users today (users who updated their profile today)
    const activeUsersToday = await db.collection('users').countDocuments({
      updatedAt: { $gte: todayStart, $lte: todayEnd },
      isGuest: { $ne: true }
    });

    // Get total users
    const totalUsers = await db.collection('users').countDocuments({
      isGuest: { $ne: true }
    });

    // Get new users today
    const newUsersToday = await db.collection('users').countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
      isGuest: { $ne: true }
    });

    // Get new users this week
    const newUsersThisWeek = await db.collection('users').countDocuments({
      createdAt: { $gte: weekStart },
      isGuest: { $ne: true }
    });

    // Get new users this month
    const newUsersThisMonth = await db.collection('users').countDocuments({
      createdAt: { $gte: monthStart },
      isGuest: { $ne: true }
    });

    return NextResponse.json({
      success: true,
      data: {
        signupsByDate,
        activeUsersToday,
        totalUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth
      }
    });

  } catch (error) {
    console.error('Error fetching user statistics:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch user statistics' 
      },
      { status: 500 }
    );
  }
}
