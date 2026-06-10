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

interface UserWithDailyCase {
  _id: string;
  email: string;
  name?: string;
  username?: string;
  image?: string;
  steamId?: string;
  tradeLink?: string;
  cryptoAddresses?: {
    bitcoin?: string;
    ethereum?: string;
  };
  dailyCase: DailyCase[];
}

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

         // Find users who have daily case items
     const users = await db
       .collection('users')
       .find({
         dailyCase: { $exists: true, $ne: [] }
       })
       .project({
         _id: 1,
         email: 1,
         name: 1,
         username: 1,
         image: 1,
         steamId: 1,
         tradeLink: 1,
         cryptoAddresses: 1,
         dailyCase: 1,
         lastCryptoSetupEmailSent: 1
       })
       .sort({ createdAt: -1 })
       .toArray();

    // Collect all unique precase IDs from all users
    const precaseIds = new Set<string>();
    users.forEach((user) => {
      user.dailyCase?.forEach((dailyCase: any) => {
        if (dailyCase.id) {
          precaseIds.add(dailyCase.id);
        }
      });
    });

    // Fetch all precases in a single query
    const precaseMap = new Map();
    if (precaseIds.size > 0) {
      const precases = await db
        .collection('precases')
        .find({ _id: { $in: Array.from(precaseIds).map(id => new ObjectId(id)) } })
        .toArray();
      
      precases.forEach((precase) => {
        precaseMap.set(precase._id.toString(), precase);
      });
    }

    // Populate users with precase data from the map
    const populatedUsers = users.map((user) => {
      const populatedDailyCase = user.dailyCase.map((dailyCase: any) => {
        if (dailyCase.id && precaseMap.has(dailyCase.id)) {
          const precase = precaseMap.get(dailyCase.id);
          return {
            ...dailyCase,
            precase: {
              name: precase.name,
              image: precase.image,
              weapon: precase.weapon ? { name: precase.weapon.name } : undefined,
              category: precase.category ? { name: precase.category.name } : undefined,
              rarity: precase.rarity ? { 
                name: precase.rarity.name, 
                color: precase.rarity.color 
              } : undefined,
              price: precase.price
            }
          };
        }
        return dailyCase;
      });

      return {
        ...user,
        _id: user._id.toString(), // Convert ObjectId to string
        dailyCase: populatedDailyCase
      };
    });

    return NextResponse.json({
      success: true,
      data: populatedUsers
    });

  } catch (error) {
    console.error('Error fetching users with daily case items:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch users with daily case items' 
      },
      { status: 500 }
    );
  }
}
