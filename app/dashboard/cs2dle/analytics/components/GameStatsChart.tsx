"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartConfig 
} from '@/components/ui/chart';
import { 
  Line,
  LineChart, 
  CartesianGrid, 
  XAxis, 
  YAxis,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Gamepad2, Trophy, TrendingUp, BarChart3 } from 'lucide-react';

interface GameDailyStats {
  date: string;
  plays: number;
  wins: number;
  winRate: number;
}

interface GameStats {
  gameType: string;
  gameName: string;
  dailyStats: GameDailyStats[];
  summary: {
    totalPlays: number;
    totalWins: number;
    averageWinRate: number;
    averagePlaysPerDay: number;
  };
}

interface GameStatsResponse {
  period: string;
  games: GameStats[];
  periodStart: string;
  periodEnd: string;
}

interface GameStatsChartProps {
  defaultPeriod?: string;
}

// Color palette for different games
const GAME_COLORS: { [key: string]: string } = {
  'GuessSkin': 'hsl(217, 100%, 50%)',      // Blue
  'EmojiPuzzle': 'hsl(36, 100%, 50%)',     // Orange
  'GuessPrice': 'hsl(282, 100%, 50%)',     // Purple
  'HigherLower': 'hsl(115, 100%, 45%)',    // Green
  'Wordle': 'hsl(0, 100%, 45%)'            // Red
};

export const GameStatsChart = ({ defaultPeriod = '7d' }: GameStatsChartProps) => {
  const [data, setData] = useState<GameStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(defaultPeriod);
  const [selectedMetric, setSelectedMetric] = useState<'plays' | 'wins'>('plays');

  const periods = [
    { value: '7d', label: '7 Days' },
    { value: '14d', label: '14 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: 'all', label: 'All Time' },
  ];

  const fetchGameStats = async (period: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/cs2dle/analytics/game-stats?period=${period}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError("Failed to fetch game stats");
      }
    } catch (err) {
      setError("An error occurred while fetching game stats");
      console.error("Game stats fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameStats(selectedPeriod);
  }, [selectedPeriod]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Game Statistics</CardTitle>
          <CardDescription>Loading game statistics...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Game Statistics</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => fetchGameStats(selectedPeriod)}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.games.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Game Statistics</CardTitle>
          <CardDescription>Track game performance over time</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="text-center py-8 text-muted-foreground">
            <p>No game statistics available for the selected period.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Merge all daily stats into a single array with all games
  const allDates = new Set<string>();
  data.games.forEach(game => {
    game.dailyStats.forEach(stat => allDates.add(stat.date));
  });

  const sortedDates = Array.from(allDates).sort();

  // Build chart data
  const chartData = sortedDates.map(date => {
    const dataPoint: any = {
      date: format(parseISO(date), 'MMM dd'),
      fullDate: format(parseISO(date), 'MMM dd, yyyy'),
    };

    data.games.forEach(game => {
      const stat = game.dailyStats.find(s => s.date === date);
      dataPoint[`${game.gameType}_plays`] = stat?.plays || 0;
      dataPoint[`${game.gameType}_wins`] = stat?.wins || 0;
    });

    return dataPoint;
  });

  // Build chart config dynamically
  const chartConfig: ChartConfig = {};
  data.games.forEach(game => {
    chartConfig[`${game.gameType}_plays`] = {
      label: `${game.gameName} (Plays)`,
      color: GAME_COLORS[game.gameType] || 'hsl(var(--chart-1))',
    };
    chartConfig[`${game.gameType}_wins`] = {
      label: `${game.gameName} (Wins)`,
      color: GAME_COLORS[game.gameType] || 'hsl(var(--chart-1))',
    };
  });

  const getPeriodLabel = (period: string) => {
    const periodMap: { [key: string]: string } = {
      '7d': 'Last 7 Days',
      '14d': 'Last 14 Days',
      '30d': 'Last 30 Days',
      '90d': 'Last 90 Days',
      'all': 'All Time (Last 365 Days)',
    };
    return periodMap[period] || 'Last 30 Days';
  };

  // Calculate totals
  const totalPlays = data.games.reduce((sum, game) => sum + game.summary.totalPlays, 0);
  const totalWins = data.games.reduce((sum, game) => sum + game.summary.totalWins, 0);
  const overallWinRate = totalPlays > 0 ? (totalWins / totalPlays) * 100 : 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>
              <div className="flex items-end gap-2">
                <Gamepad2 size={30} color="#2FFF00" />
                Daily Game Statistics
              </div>
            </CardTitle>
            <CardDescription className="mt-1">
              {getPeriodLabel(selectedPeriod)}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={selectedMetric} onValueChange={(value: 'plays' | 'wins') => setSelectedMetric(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plays">Plays</SelectItem>
                <SelectItem value="wins">Wins</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overall Summary */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
            <Gamepad2 className="h-3 w-3 mr-1" />
            Total Plays: {totalPlays.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
            <Trophy className="h-3 w-3 mr-1" />
            Total Wins: {totalWins.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
            <TrendingUp className="h-3 w-3 mr-1" />
            Overall Win Rate: {overallWinRate.toFixed(1)}%
          </Badge>
        </div>

        {/* Per-Game Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mt-4">
          {data.games.map(game => (
            <div 
              key={game.gameType}
              className="p-3 rounded-lg border"
              style={{ 
                borderColor: GAME_COLORS[game.gameType],
                backgroundColor: `${GAME_COLORS[game.gameType]}10`
              }}
            >
              <div className="text-sm font-semibold mb-2" style={{ color: GAME_COLORS[game.gameType] }}>
                {game.gameName}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Plays:</span>
                  <span className="font-medium">{game.summary.totalPlays.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Wins:</span>
                  <span className="font-medium">{game.summary.totalWins.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Win Rate:</span>
                  <span className="font-medium">{game.summary.averageWinRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <LineChart 
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <ChartTooltip
              content={
                <ChartTooltipContent 
                  labelFormatter={(value, payload) => {
                    return payload?.[0]?.payload?.fullDate || value;
                  }}
                />
              }
            />
            <Legend />
            {data.games.map(game => (
              <Line
                key={`${game.gameType}_${selectedMetric}`}
                type="monotone"
                dataKey={`${game.gameType}_${selectedMetric}`}
                stroke={GAME_COLORS[game.gameType]}
                strokeWidth={2}
                dot={{ r: 3 }}
                name={game.gameName}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

