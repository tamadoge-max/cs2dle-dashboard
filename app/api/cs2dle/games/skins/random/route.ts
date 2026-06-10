import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const skins = await db
      .collection("csgoskins")
      .aggregate([
        {
          $match: {
            $and: [
              { "category.name": { $ne: "Knives" } },
              { "category.name": { $ne: "Gloves" } }
            ]
          }
        },
        { $sample: { size: 1 } }
      ])
      .toArray();

    if (skins.length === 0) {
      return NextResponse.json(
        { error: "No skins found in database" },
        { status: 404 }
      );
    }

    // Return the single random skin
    return NextResponse.json({ skin: skins[0] });
  } catch (error) {
    console.error("Error fetching random skin:", error);
    return NextResponse.json(
      { error: "Failed to fetch random skin" },
      { status: 500 }
    );
  }
}
