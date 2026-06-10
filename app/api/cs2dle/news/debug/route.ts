import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// Debug endpoint to check what's in the database
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Get all collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Try to get data from 'news' collection
    const newsCount = await db.collection('news').countDocuments();
    const newsSample = await db.collection('news').find().limit(3).toArray();

    // Check if there's data in other potential collections
    const potentialCollections = ['news', 'articles', 'posts', 'newsarticles'];
    const collectionData: any = {};

    for (const collName of potentialCollections) {
      if (collectionNames.includes(collName)) {
        const count = await db.collection(collName).countDocuments();
        const sample = await db.collection(collName).find().limit(2).toArray();
        collectionData[collName] = {
          count,
          sample
        };
      }
    }

    return NextResponse.json({
      success: true,
      debug: {
        allCollections: collectionNames,
        newsCollection: {
          count: newsCount,
          sample: newsSample
        },
        collectionData
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

