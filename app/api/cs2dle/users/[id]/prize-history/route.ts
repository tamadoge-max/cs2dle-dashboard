import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = await params;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Find the user and get their monthly prize history
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { 
        projection: { 
          _id: 1,
          username: 1,
          name: 1,
          image: 1,
          monthlyPrize: 1
        } 
      }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Populate monthly prize data with prize details
    const populatedMonthlyPrizes = await Promise.all(
      (user.monthlyPrize || []).map(async (monthlyPrize: any) => {
        if (monthlyPrize.id) {
          // Find the monthly prize item details
          const prize = await db
            .collection('monthlyprizes')
            .findOne({ _id: new ObjectId(monthlyPrize.id) });
          
          if (prize) {
            return {
              ...monthlyPrize,
              prize: {
                name: prize.name,
                image: prize.image,
                rarity: prize.rarity ? { 
                  name: prize.rarity.name, 
                  color: prize.rarity.color 
                } : undefined,
                price: prize.price
              }
            };
          }
        }
        return monthlyPrize;
      })
    );

    // Sort monthly prizes by monthYear (newest first)
    const sortedPrizes = populatedMonthlyPrizes.sort((a: any, b: any) => {
      return b.monthYear.localeCompare(a.monthYear);
    });

    return NextResponse.json({
      success: true,
      data: sortedPrizes,
      user: {
        _id: user._id.toString(),
        username: user.username || user.name || "Anonymous",
        avatar: user.image || '/placeholder-user.jpg'
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching user prize history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prize history' },
      { status: 500 }
    );
  }
}
