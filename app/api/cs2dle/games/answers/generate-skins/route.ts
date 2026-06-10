import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { count = 5 } = await request.json();

    // Validate count (max 10 skins per date)
    if (count < 1 || count > 10) {
      return NextResponse.json(
        { error: "Count must be between 1 and 10" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Get completely random skins
    const skins = await db
      .collection("csgoskins")
      .aggregate([
        { $sample: { size: count } },
        {
          $project: {
            _id: 1,
            name: 1,
            description: 1,
            image: 1,
            weapon: 1,
            category: 1,
            pattern: 1,
            rarity: 1,
            team: 1,
            year: 1,
          },
        },
      ])
      .toArray();

    if (skins.length === 0) {
      return NextResponse.json(
        { error: "No skins found in database" },
        { status: 404 }
      );
    }

    return NextResponse.json({ skins });
  } catch (error) {
    console.error("Error generating skins:", error);
    return NextResponse.json(
      { error: "Failed to generate skins" },
      { status: 500 }
    );
  }
}
