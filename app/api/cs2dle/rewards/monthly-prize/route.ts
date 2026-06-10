import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';


type MonthlyPrizeData = {
  name: string;
  image?: string;
  price?: number;
  monthYear: string; // Format: yyyy-mm
  rarity?: {
    name: string;
    color: string;
  };
  status: 'active' | 'inactive';
  createdBy?: string;
  lastModifiedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    const monthlyPrizes = await db.collection('monthlyprizes')
      .find({})
      .sort({ monthYear: -1 })
      .toArray();

    return NextResponse.json({ monthlyPrizes }, { status: 200 });
  } catch (error) {
    console.error('Error fetching monthly prizes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly prizes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.monthYear) {
      return NextResponse.json(
        { error: 'name and monthYear are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Create new monthly prize
    const monthlyPrize = {
      name: data.name,
      image: data.image || '',
      price: data.price || 0,
      monthYear: data.monthYear,
      rarity: data.rarity || { name: 'Consumer Grade', color: '#b0c3d9' },
      status: 'active' as const,
      createdBy: session.user.email || undefined,
      lastModifiedBy: session.user.email || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await db.collection('monthlyprizes').insertOne(monthlyPrize);

    return NextResponse.json({
      message: 'Monthly prize created successfully',
      monthlyPrize: { ...monthlyPrize, _id: result.insertedId }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating monthly prize:', error);
    return NextResponse.json(
      { error: 'Failed to create monthly prize' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    if (!data._id) {
      return NextResponse.json(
        { error: '_id is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const updateData: Partial<MonthlyPrizeData> = {
      lastModifiedBy: session.user.email || undefined,
      updatedAt: new Date().toISOString()
    };

    // Only update fields that are provided
    if (data.status !== undefined) updateData.status = data.status;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.rarity !== undefined) updateData.rarity = data.rarity;
    if (data.monthYear !== undefined) updateData.monthYear = data.monthYear;

    const result = await db.collection('monthlyprizes').updateOne(
      { _id: new ObjectId(data._id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Monthly prize not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Monthly prize updated successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating monthly prize:', error);
    return NextResponse.json(
      { error: 'Failed to update monthly prize' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const _id = searchParams.get('_id');

    if (!_id) {
      return NextResponse.json(
        { error: '_id is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection('monthlyprizes').deleteOne({ _id: new ObjectId(_id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Monthly prize not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Monthly prize deleted successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting monthly prize:', error);
    return NextResponse.json(
      { error: 'Failed to delete monthly prize' },
      { status: 500 }
    );
  }
}