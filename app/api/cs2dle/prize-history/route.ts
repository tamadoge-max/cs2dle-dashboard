import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Get all users with their monthly prize history
    const users = await db.collection('users').find(
      { monthlyPrize: { $exists: true, $ne: [] } },
      { 
        projection: { 
          _id: 1,
          username: 1,
          name: 1,
          image: 1,
          monthlyPrize: 1
        } 
      }
    ).toArray();

    // Flatten all prize entries with user information
    const allPrizeHistory = [];
    
    for (const user of users) {
      const userName = user.username || user.name || "Anonymous";
      const userAvatar = user.image || '/placeholder-user.jpg';
      
      if (user.monthlyPrize && Array.isArray(user.monthlyPrize)) {
        for (const prize of user.monthlyPrize) {
          allPrizeHistory.push({
            ...prize,
            user: {
              _id: user._id.toString(),
              name: userName,
              avatar: userAvatar
            }
          });
        }
      }
    }

    // Sort by monthYear (newest first), then by claimData (newest first)
    const sortedPrizeHistory = allPrizeHistory.sort((a, b) => {
      const monthYearComparison = b.monthYear.localeCompare(a.monthYear);
      if (monthYearComparison !== 0) {
        return monthYearComparison;
      }
      return new Date(b.claimData).getTime() - new Date(a.claimData).getTime();
    });

    return NextResponse.json({
      success: true,
      data: sortedPrizeHistory,
      total: sortedPrizeHistory.length
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching all prize history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prize history' },
      { status: 500 }
    );
  }
}
