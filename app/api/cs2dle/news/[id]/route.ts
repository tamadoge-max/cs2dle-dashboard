import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET single news by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db();

    const news = await db.collection('news').findOne({ _id: new ObjectId(params.id) });

    if (!news) {
      return NextResponse.json(
        { success: false, message: 'News not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: news }, { status: 200 });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}

// PUT - Update news
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, content, image, author, category, tags, relatedNews, published } = body;

    // Validation
    if (!title || !description || !content || !image || !author || !category) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const updateData = {
      title,
      description,
      content,
      image,
      author,
      category,
      tags: tags || [],
      relatedNews: relatedNews || [],
      published: published !== undefined ? published : false,
      updatedAt: new Date()
    };

    const result = await db.collection('news').updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'News not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'News updated successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating news:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update news' },
      { status: 500 }
    );
  }
}

// DELETE news
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection('news').deleteOne({ _id: new ObjectId(params.id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'News not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'News deleted successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting news:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete news' },
      { status: 500 }
    );
  }
}

