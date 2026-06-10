import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { News } from '@/types/news';

interface NewsResponse {
  success: boolean;
  data?: News[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  message?: string;
}

// GET all news with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const published = searchParams.get('published');
    
    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit));
    const skip = (validPage - 1) * validLimit;

    const client = await clientPromise;
    const db = client.db();

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }

    // Only filter by published status if it's explicitly 'true' or 'false'
    if (published === 'true' || published === 'false') {
      query.published = published === 'true';
    }

    // Get total count
    const totalNews = await db.collection('news').countDocuments(query);

    // Fetch news
    const news = await db
      .collection('news')
      .find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(validLimit)
      .toArray();

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalNews / validLimit);
    const hasNextPage = validPage < totalPages;
    const hasPrevPage = validPage > 1;

    const response: NewsResponse = {
      success: true,
      data: news as unknown as News[],
      pagination: {
        page: validPage,
        limit: validLimit,
        total: totalNews,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch news' 
      },
      { status: 500 }
    );
  }
}

// POST - Create new news article
export async function POST(request: NextRequest) {
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

    const newNews = {
      title,
      description,
      content,
      image,
      author,
      category,
      tags: tags || [],
      date: new Date(),
      relatedNews: relatedNews || [],
      published: published !== undefined ? published : false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('news').insertOne(newNews);

    return NextResponse.json(
      { 
        success: true,
        message: 'News created successfully',
        data: { ...newNews, _id: result.insertedId }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating news:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to create news' 
      },
      { status: 500 }
    );
  }
}

