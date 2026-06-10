"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { PriceUpdateButton } from "@/components/PriceUpdateButton";
import SkinDataDisplay from "@/components/SkinDataDisplay";

const HigherOrLowerPage = () => {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/cs2dle/games">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Games
            </Button>
          </Link>
        </div>
      </div>

      {/* Game Content */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <Image
          src="/images/cs2dle/logo.png"
          alt="CS2DLE Logo"
          width={300}
          height={300}
        />
      </div>
      <div className="text-center w-full flex items-center">
        <div className="flex gap-2 items-center justify-center">
          <div className="flex justify-center">
            <PriceUpdateButton />
          </div>
        </div>
      </div>
      {/* Skin Data Display */}
      <SkinDataDisplay />
    </div>
  );
};

export default HigherOrLowerPage;
