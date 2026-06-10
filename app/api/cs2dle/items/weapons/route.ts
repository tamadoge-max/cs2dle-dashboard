import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

interface WeaponsResponse {
  weapons: string[];
}

export async function GET(): Promise<NextResponse<WeaponsResponse>> {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Get unique weapons from the skins collection
    const weapons = await db.collection('csgoskins')
      .distinct('weapon.name', { 'weapon.name': { $exists: true } });
    
    // Filter out null/undefined values and sort weapons
    const sortedWeapons = ['all', ...weapons.filter(Boolean).sort()];

    // Prepare response
    const response: WeaponsResponse = {
      weapons: sortedWeapons
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching weapons:', error);

    // Handle MongoDB connection errors
    if (error instanceof Error && error.name === 'MongoNetworkError') {
      return NextResponse.json(
        { weapons: ['all'] },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { weapons: ['all'] },
      { status: 500 }
    );
  }
}
