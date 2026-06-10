import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";

const MARKETPLACE_KEYS = [
  "privateSkins",
  "skinport",
  "buff163",
  "skinflow",
  "haloskins",
  "skinbaron",
  "dmarket",
];

const MARKETPLACE_DISPLAY_NAMES: Record<string, string> = {
  privateSkins: "Private Skins",
  skinport: "Skinport",
  buff163: "BUFF163",
  skinflow: "Skinflow",
  haloskins: "Halo Skins",
  skinbaron: "SkinBaron",
  dmarket: "DMarket",
};

const COLLECTION_NAME = "marketplaces";

type MarketplaceDocument = {
  _id: string;
  name: string;
  active: boolean;
  updatedAt?: Date;
  updatedBy?: string;
  createdAt?: Date;
};

type MarketplaceResponse = {
  key: string;
  name: string;
  active: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  createdAt: string | null;
};

function normalizeMarketplace(doc?: MarketplaceDocument | null): MarketplaceResponse {
  if (!doc) {
    return {
      key: "",
      name: "",
      active: true,
      updatedAt: null,
      updatedBy: null,
      createdAt: null,
    };
  }

  return {
    key: doc._id,
    name: doc.name ?? MARKETPLACE_DISPLAY_NAMES[doc._id] ?? doc._id,
    active: doc.active ?? true,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc.updatedBy ?? null,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
  };
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    const documents = await db
      .collection<MarketplaceDocument>(COLLECTION_NAME)
      .find({ _id: { $in: MARKETPLACE_KEYS } })
      .toArray();

    const byKey = new Map(documents.map((doc) => [doc._id, doc] as const));

    const marketplaces: MarketplaceResponse[] = MARKETPLACE_KEYS.map((key) => {
      const existing = byKey.get(key);
      return {
        key,
        name: MARKETPLACE_DISPLAY_NAMES[key] ?? key,
        active: existing?.active ?? true,
        updatedAt: existing?.updatedAt ? existing.updatedAt.toISOString() : null,
        updatedBy: existing?.updatedBy ?? null,
        createdAt: existing?.createdAt ? existing.createdAt.toISOString() : null,
      };
    });

    return NextResponse.json({ marketplaces });
  } catch (error) {
    console.error("Error fetching marketplaces:", error);
    return NextResponse.json({ message: "Failed to fetch marketplaces" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { marketplace, active } = body ?? {};

    if (typeof marketplace !== "string" || typeof active !== "boolean") {
      return NextResponse.json(
        { message: "Invalid payload: marketplace (string) and active (boolean) are required" },
        { status: 400 }
      );
    }

    if (!MARKETPLACE_KEYS.includes(marketplace)) {
      return NextResponse.json({ message: "Unknown marketplace" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const now = new Date();

    const collection = db.collection<MarketplaceDocument>(COLLECTION_NAME);

    const updateResult = await collection.updateOne(
      { _id: marketplace },
      {
        $set: {
          name: MARKETPLACE_DISPLAY_NAMES[marketplace] ?? marketplace,
          active,
          updatedAt: now,
          updatedBy: session.user.email,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    if (!updateResult.acknowledged) {
      throw new Error("Failed to update marketplace");
    }

    const updatedDoc = await collection.findOne({ _id: marketplace });
    if (!updatedDoc) {
      throw new Error("Marketplace not found after update");
    }

    const responsePayload = normalizeMarketplace(updatedDoc);

    return NextResponse.json({ marketplace: responsePayload });
  } catch (error) {
    console.error("Error updating marketplace:", error);
    return NextResponse.json({ message: "Failed to update marketplace" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return PATCH(request);
}

