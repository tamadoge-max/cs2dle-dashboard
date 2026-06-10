import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7'); // Default to 7 days
    const validDays = Math.min(365, Math.max(1, days)); // Max 1 year, min 1 day

    const client = await clientPromise;
    const db = client.db();

    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - validDays);

    // Get inactive users with only name and email
    const users = await db.collection('users').find({
      updatedAt: { $lt: cutoffDate },
      isGuest: { $ne: true } // Exclude guest users
    }, { 
      projection: { name: 1, email: 1, _id: 0 } 
    })
    .sort({ updatedAt: 1 }) // Sort by oldest updatedAt first
    .toArray();

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error('Error fetching inactive users for export:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch inactive users for export' 
      },
      { status: 500 }
    );
  }
}
