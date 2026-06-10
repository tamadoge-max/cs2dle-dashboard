"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Gift,
  Calendar,
  Trophy,
  DollarSign,
  Package,
  Star,
  Clock,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { format, parseISO } from "date-fns";

interface DailyCaseItem {
  _id: string;
  id: string;
  claimData: string;
  precase?: {
    name: string;
    image: string;
    weapon?: { name: string };
    category?: { name: string };
    rarity?: { name: string; color: string };
    price: number;
  };
}

interface WeeklyPrizeItem {
  id: string;
  active: boolean;
  weekStartDate: string;
  weekEndDate: string;
  claimData: string;
  receivedData?: string;
  weeklyPrize?: {
    name: string;
    image: string;
    rarity?: { name: string; color: string };
    price: number;
  };
}

interface MonthlyPrizeItem {
  id: string;
  active: boolean;
  monthYear: string;
  claimData: string;
  receivedData?: string;
  prize?: {
    name: string;
    image: string;
    rarity?: { name: string; color: string };
    price: number;
  };
}

interface UserRewardDetails {
  dailyCase: DailyCaseItem[];
  weeklyPrize: WeeklyPrizeItem[];
  monthlyPrize: MonthlyPrizeItem[];
}

interface UserRewardDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

export const UserRewardDetailsModal = ({
  isOpen,
  onClose,
  userId,
}: UserRewardDetailsModalProps) => {
  const [rewardDetails, setRewardDetails] = useState<UserRewardDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRewardDetails = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch daily case items
      const dailyCaseResponse = await fetch(`/api/cs2dle/rewards/daily-case/users`);
      const dailyCaseResult = await dailyCaseResponse.json();
      
      // Find the specific user's daily case items
      const userDailyCases = dailyCaseResult.success 
        ? dailyCaseResult.data.find((user: any) => user._id === userId)?.dailyCase || []
        : [];

      // Fetch weekly prize items
      const weeklyPrizeResponse = await fetch(`/api/cs2dle/rewards/weekly-prize/users`);
      const weeklyPrizeResult = await weeklyPrizeResponse.json();
      
      // Find the specific user's weekly prize items
      const userWeeklyPrizes = weeklyPrizeResult.success 
        ? weeklyPrizeResult.data.find((user: any) => user._id === userId)?.weeklyPrize || []
        : [];

      // Fetch monthly prize history
      const monthlyPrizeResponse = await fetch(`/api/cs2dle/users/${userId}/prize-history`);
      const monthlyPrizeResult = await monthlyPrizeResponse.json();
      
      const userMonthlyPrizes = monthlyPrizeResult.success 
        ? monthlyPrizeResult.data || []
        : [];

      setRewardDetails({
        dailyCase: userDailyCases,
        weeklyPrize: userWeeklyPrizes,
        monthlyPrize: userMonthlyPrizes,
      });
    } catch (err) {
      setError("An error occurred while fetching reward details");
      console.error("Reward details fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchRewardDetails();
    }
  }, [isOpen, userId]);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM dd, yyyy 'at' HH:mm");
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getRarityColor = (color?: string) => {
    return color || '#b0c3d9';
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Reward Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Reward Details
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchRewardDetails}>Try Again</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!rewardDetails) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Reward Details
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Daily Cases ({rewardDetails.dailyCase.length})
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Weekly Prizes ({rewardDetails.weeklyPrize.length})
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Monthly Prizes ({rewardDetails.monthlyPrize.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Daily Case Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rewardDetails.dailyCase.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No daily case items found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rewardDetails.dailyCase.map((item, index) => (
                      <Card key={index} className="relative">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {item.precase?.image && (
                              <div className="relative w-16 h-16 flex-shrink-0">
                                <Image
                                  src={item.precase.image}
                                  alt={item.precase.name}
                                  fill
                                  className="object-contain rounded"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">
                                {item.precase?.name || "Unknown Item"}
                              </h4>
                              {item.precase?.weapon && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {item.precase.weapon.name}
                                </p>
                              )}
                              {item.precase?.category && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {item.precase.category.name}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                {item.precase?.rarity && (
                                  <Badge
                                    variant="outline"
                                    style={{
                                      backgroundColor: getRarityColor(item.precase.rarity.color) + '20',
                                      borderColor: getRarityColor(item.precase.rarity.color),
                                      color: getRarityColor(item.precase.rarity.color),
                                    }}
                                    className="text-xs"
                                  >
                                    {item.precase.rarity.name}
                                  </Badge>
                                )}
                                {item.precase?.price !== undefined && (
                                  <Badge variant="secondary" className="text-xs">
                                    {formatPrice(item.precase.price)}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {formatDate(item.claimData)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Weekly Prize Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rewardDetails.weeklyPrize.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No weekly prize items found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rewardDetails.weeklyPrize.map((item, index) => (
                      <Card key={index} className="relative">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {item.weeklyPrize?.image && (
                              <div className="relative w-16 h-16 flex-shrink-0">
                                <Image
                                  src={item.weeklyPrize.image}
                                  alt={item.weeklyPrize.name}
                                  fill
                                  className="object-contain rounded"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">
                                {item.weeklyPrize?.name || "Unknown Prize"}
                              </h4>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                Week: {item.weekStartDate} - {item.weekEndDate}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {item.weeklyPrize?.rarity && (
                                  <Badge
                                    variant="outline"
                                    style={{
                                      backgroundColor: getRarityColor(item.weeklyPrize.rarity.color) + '20',
                                      borderColor: getRarityColor(item.weeklyPrize.rarity.color),
                                      color: getRarityColor(item.weeklyPrize.rarity.color),
                                    }}
                                    className="text-xs"
                                  >
                                    {item.weeklyPrize.rarity.name}
                                  </Badge>
                                )}
                                {item.weeklyPrize?.price !== undefined && (
                                  <Badge variant="secondary" className="text-xs">
                                    {formatPrice(item.weeklyPrize.price)}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {formatDate(item.claimData)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Monthly Prize History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rewardDetails.monthlyPrize.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No monthly prizes found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rewardDetails.monthlyPrize.map((item, index) => (
                      <Card key={index} className="relative">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {item.prize?.image && (
                              <div className="relative w-16 h-16 flex-shrink-0">
                                <Image
                                  src={item.prize.image}
                                  alt={item.prize.name}
                                  fill
                                  className="object-contain rounded"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">
                                {item.prize?.name || "Monthly Prize"}
                              </h4>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                {item.monthYear}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {item.prize?.rarity && (
                                  <Badge
                                    variant="outline"
                                    style={{
                                      backgroundColor: getRarityColor(item.prize.rarity.color) + '20',
                                      borderColor: getRarityColor(item.prize.rarity.color),
                                      color: getRarityColor(item.prize.rarity.color),
                                    }}
                                    className="text-xs"
                                  >
                                    {item.prize.rarity.name}
                                  </Badge>
                                )}
                                {item.prize?.price !== undefined && (
                                  <Badge variant="secondary" className="text-xs">
                                    {formatPrice(item.prize.price)}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800 text-xs">
                                  <Trophy className="h-3 w-3 mr-1" />
                                  Winner
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {formatDate(item.claimData)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
