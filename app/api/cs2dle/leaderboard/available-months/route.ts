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

    // Get all unique months from monthlyScores collection
    const months = await db.collection("monthlyScores").distinct("month");
    
    // Sort months in descending order (newest first)
    const sortedMonths = months.sort((a, b) => b.localeCompare(a));

    return NextResponse.json({
      success: true,
      months: sortedMonths
    });
  } catch (error) {
    console.error("Available months API Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch available months" },
      { status: 500 }
    );
  }
}
