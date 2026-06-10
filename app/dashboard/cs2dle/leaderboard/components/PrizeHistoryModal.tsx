"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Trophy, Gift, Clock } from "lucide-react";
import Image from "next/image";

interface PrizeHistoryEntry {
  _id: string;
  monthYear: string;
  claimData: string;
  active: boolean;
  prizeData: {
    name: string;
    image?: string;
    price?: number;
    rarity?: {
      name: string;
      color: string;
    };
  };
  user: {
    _id: string;
    name: string;
    avatar: string;
  };
}

interface PrizeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrizeHistoryModal = ({
  isOpen,
  onClose,
}: PrizeHistoryModalProps) => {
  const [prizeHistory, setPrizeHistory] = useState<PrizeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrizeHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cs2dle/prize-history`);
      const result = await response.json();

      if (result.success) {
        // Sort by price (highest to lowest), then by date (newest to oldest)
        const sortedData = (result.data || []).sort((a: PrizeHistoryEntry, b: PrizeHistoryEntry) => {
          const priceA = a.prizeData.price || 0;
          const priceB = b.prizeData.price || 0;
          
          // First sort by price (descending)
          if (priceA !== priceB) {
            return priceB - priceA;
          }
          
          // If prices are equal, sort by date (newest first)
          return new Date(b.claimData).getTime() - new Date(a.claimData).getTime();
        });
        
        setPrizeHistory(sortedData);
      } else {
        setError(result.error || "Failed to fetch prize history");
      }
    } catch (err) {
      console.error("Error fetching prize history:", err);
      setError("An error occurred while fetching prize history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPrizeHistory();
    }
  }, [isOpen]);

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (active: boolean) => {
    return active ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        Active
      </Badge>
    ) : (
      <Badge variant="secondary">
        Inactive
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Complete Monthly Prize History
          </DialogTitle>
          <DialogDescription>
            All monthly prize assignments across all users, sorted by price (highest to lowest)
          </DialogDescription>
        </DialogHeader>

        {/* Monthly Summary */}
        {prizeHistory.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {new Set(prizeHistory.map(entry => entry.monthYear)).size}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Months</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {prizeHistory.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Prizes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {new Set(prizeHistory.map(entry => entry.user._id)).size}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Winners</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  ${prizeHistory.reduce((sum, entry) => sum + (entry.prizeData.price || 0), 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Value</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  ${Math.max(...prizeHistory.map(entry => entry.prizeData.price || 0)).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Highest Prize</div>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-sm" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">Error loading prize history</div>
              <div className="text-sm text-gray-500">{error}</div>
            </div>
          ) : prizeHistory.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-500 mb-2">No prize history found</div>
              <div className="text-sm text-gray-400">
                No monthly prizes have been assigned to any users yet.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {prizeHistory.map((entry, index) => {
                const currentMonth = formatMonthYear(entry.monthYear);
                const previousMonth = index > 0 ? formatMonthYear(prizeHistory[index - 1].monthYear) : null;
                const showMonthHeader = currentMonth !== previousMonth;
                const priceRank = index + 1;
                
                return (
                  <div key={entry._id}>
                    {showMonthHeader && (
                      <div className="sticky top-0 px-5 bg-white dark:bg-gray-900 py-2 mb-3 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-blue-500" />
                          {currentMonth}
                        </h3>
                      </div>
                    )}
                    <div className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}>
                  {/* Price Rank */}
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      priceRank === 1 ? 'bg-yellow-500 text-white' :
                      priceRank === 2 ? 'bg-gray-400 text-white' :
                      priceRank === 3 ? 'bg-orange-500 text-white' :
                      'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      #{priceRank}
                    </div>
                  </div>

                  {/* Prize Image */}
                  <div className="flex-shrink-0">
                    {entry.prizeData.image ? (
                      <Image
                        src={entry.prizeData.image}
                        alt={entry.prizeData.name}
                        width={48}
                        height={48}
                        className="rounded-sm object-cover"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-sm flex items-center justify-center"
                        style={{ 
                          backgroundColor: entry.prizeData.rarity?.color || '#b0c3d9' 
                        }}
                      >
                        <Gift className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Prize Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm truncate">
                        {entry.prizeData.name}
                      </h3>
                      {entry.prizeData.price && (
                        <div className="flex items-center gap-1">
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            ${entry.prizeData.price.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(entry.claimData)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.prizeData.rarity && (
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{ 
                            borderColor: entry.prizeData.rarity.color,
                            color: entry.prizeData.rarity.color 
                          }}
                        >
                          {entry.prizeData.rarity.name}
                        </Badge>
                      )}
                      {/* User Info */}
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>Winner:</span>
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={entry.user.avatar} alt={entry.user.name} />
                          <AvatarFallback className="text-xs">
                            {entry.user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{entry.user.name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0">
                    {getStatusBadge(entry.active)}
                  </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <div className="text-sm text-gray-500">
            Total prizes: {prizeHistory.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
