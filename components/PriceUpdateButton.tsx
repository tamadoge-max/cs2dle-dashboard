"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

interface UpdateResult {
  success: boolean;
  message: string;
  data?: {
    processedSkins: number;
    matchedItems: number;
    updatedItems: number;
    totalItems: number;
    unmatchedItems: number;
  };
  error?: string;
}

export function PriceUpdateButton() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<UpdateResult | null>(null);

  const handleUpdatePrices = async () => {
    setIsUpdating(true);
    setLastUpdate(null);

    try {
      const response = await fetch("/api/cs2dle/items/update-price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result: UpdateResult = await response.json();
      setLastUpdate(result);

      if (response.ok && result.success) {
        toast({
          title: "Prices Updated Successfully",
          description: `Updated ${result.data?.updatedItems} items out of ${result.data?.totalItems} total items.`,
        });
      } else {
        toast({
          title: "Update Failed",
          description:
            result.message || "An error occurred while updating prices.",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setLastUpdate({
        success: false,
        message: "Network error",
        error: errorMessage,
      });

      toast({
        title: "Update Failed",
        description: "Failed to connect to the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Manual Update
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Price Update
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Update item prices from the PriceEmpire. This will process price
            data and update the database.
          </p>

          <Button
            onClick={handleUpdatePrices}
            disabled={isUpdating}
            className="w-full"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Prices...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Manual Update
              </>
            )}
          </Button>

          {lastUpdate && (
            <div className="mt-4 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                {lastUpdate.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  {lastUpdate.success ? "Update Successful" : "Update Failed"}
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-2">
                {lastUpdate.message}
              </p>

              {lastUpdate.data && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Processed Skins:</span>
                    <span className="ml-2">
                      {lastUpdate.data.processedSkins}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Matched Items:</span>
                    <span className="ml-2">{lastUpdate.data.matchedItems}</span>
                  </div>
                  <div>
                    <span className="font-medium">Updated Items:</span>
                    <span className="ml-2 text-green-600">
                      {lastUpdate.data.updatedItems}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Total Items:</span>
                    <span className="ml-2">{lastUpdate.data.totalItems}</span>
                  </div>
                  <div>
                    <span className="font-medium">Unmatched Items:</span>
                    <span className="ml-2 text-orange-600">
                      {lastUpdate.data.unmatchedItems}
                    </span>
                  </div>
                </div>
              )}

              {lastUpdate.error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  <strong>Error:</strong> {lastUpdate.error}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
