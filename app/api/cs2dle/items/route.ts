import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth';

interface ItemsResponse {
  success: boolean;
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const rarity = searchParams.get('rarity') || '';
    const weapon = searchParams.get('weapon') || '';
    
    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit)); // Max 100 items per page
    const skip = (validPage - 1) * validLimit;

    const client = await clientPromise;
    const db = client.db();

    // Build query for filtering
    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category && category !== 'all') {
      query['category.name'] = { $regex: category, $options: 'i' };
    }
    
    if (rarity && rarity !== 'all') {
      query['rarity.name'] = { $regex: rarity, $options: 'i' };
    }
    
    if (weapon && weapon !== 'all') {
      query['weapon.name'] = { $regex: weapon, $options: 'i' };
    }

    // Get total count for pagination
    const totalItems = await db.collection('csgoskins').countDocuments(query);

    // Fetch items with pagination
    const items = await db
      .collection('csgoskins')
      .find(query)
      .sort({ name: 1 }) // Sort alphabetically by name
      .skip(skip)
      .limit(validLimit)
      .toArray();

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / validLimit);
    const hasNextPage = validPage < totalPages;
    const hasPrevPage = validPage > 1;

    const response: ItemsResponse = {
      success: true,
      data: items,
      pagination: {
        page: validPage,
        limit: validLimit,
        total: totalItems,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch items' 
      },
      { status: 500 }
    );
  }
}
