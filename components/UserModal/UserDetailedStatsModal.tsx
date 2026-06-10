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
  Trophy,
  Target,
  Calendar,
  BarChart3,
  Clock,
  Award,
  Activity,
  Users,
} from "lucide-react";
import { DailyPlayCountChart } from "./DailyPlayCountChart";
import { format, parseISO } from "date-fns";

interface DailyPlayCount {
  date: string;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
}

interface GameTypeStats {
  gameType: string;
  totalGames: number;
  gamesWon: number;
  winRate: number;
  averageScore: number;
}

interface UserAnalytics {
  userId: string;
  userName: string;
  totalGames: number;
  totalWins: number;
  overallWinRate: number;
  totalScore: number;
  averageScore: number;
  bestStreak: number;
  currentStreak: number;
  dailyPlayCount: DailyPlayCount[];
  gameTypeStats: GameTypeStats[];
  lastPlayedDate?: string;
  firstPlayedDate?: string;
  mostActiveDay: string;
  mostActiveGameType: string;
}

interface UserDetailedStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

export const UserDetailedStatsModal = ({
  isOpen,
  onClose,
  userId,
}: UserDetailedStatsModalProps) => {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserAnalytics = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/cs2dle/users/${userId}/analytics`);
      const result = await response.json();

      if (result.success) {
        setAnalytics(result.data);
      } else {
        setError("Failed to fetch user analytics");
      }
    } catch (err) {
      setError("An error occurred while fetching user analytics");
      console.error("User analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserAnalytics();
    }
  }, [isOpen, userId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return format(parseISO(dateString), "MMM dd, yyyy 'at' HH:mm");
  };


  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Detailed Statistics
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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Detailed Statistics
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchUserAnalytics}>Try Again</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Detailed Statistics - {analytics.userName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Daily Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Games</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalGames.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.totalWins} wins ({analytics.overallWinRate.toFixed(1)}% win rate)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Score</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalScore.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Avg: {analytics.averageScore.toFixed(1)} per game
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Best Streak</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.bestStreak}</div>
                  <p className="text-xs text-muted-foreground">
                    Current: {analytics.currentStreak}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Most Active</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.mostActiveDay}</div>
                  <p className="text-xs text-muted-foreground">
                    Game: {analytics.mostActiveGameType}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">First Played:</span>
                      <Badge variant="outline">
                        {formatDate(analytics.firstPlayedDate)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Last Played:</span>
                      <Badge variant="outline">
                        {formatDate(analytics.lastPlayedDate)}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Most Active Day:</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                        {analytics.mostActiveDay}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Favorite Game:</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                        {analytics.mostActiveGameType}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily" className="space-y-6">
            <DailyPlayCountChart userId={analytics.userId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
