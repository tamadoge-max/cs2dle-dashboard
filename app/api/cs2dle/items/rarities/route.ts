import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

interface RaritiesResponse {
  rarities: string[];
}

export async function GET(): Promise<NextResponse<RaritiesResponse>> {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Get unique rarities from the skins collection
    const rarities = await db.collection('csgoskins')
      .distinct('rarity.name', { 'rarity.name': { $exists: true } });
    
    // Filter out null/undefined values and sort rarities
    const sortedRarities = ['all', ...rarities.filter(Boolean).sort()];

    // Prepare response
    const response: RaritiesResponse = {
      rarities: sortedRarities
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching rarities:', error);

    // Handle MongoDB connection errors
    if (error instanceof Error && error.name === 'MongoNetworkError') {
      return NextResponse.json(
        { rarities: ['all'] },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { rarities: ['all'] },
      { status: 500 }
    );
  }
}
