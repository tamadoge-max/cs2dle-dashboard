"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserPlus,
  Activity,
  Calendar,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface UserStatsData {
  signupsByDate: Array<{
    date: string;
    count: number;
  }>;
  activeUsersToday: number;
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

interface UserStatsResponse {
  success: boolean;
  data?: UserStatsData;
  message?: string;
}

const UserStatistics = () => {
  const [data, setData] = useState<UserStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState("30");

  const fetchStatistics = async (days: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/cs2dle/users/statistics?days=${days}`);
      const result: UserStatsResponse = await response.json();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError("Failed to fetch user statistics");
      }
    } catch (err) {
      setError("An error occurred while fetching statistics");
      console.error("Statistics fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics(selectedDays);
  }, [selectedDays]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTotalSignups = () => {
    return data?.signupsByDate.reduce((total, item) => total + item.count, 0) || 0;
  };

  const getAverageDailySignups = () => {
    const total = getTotalSignups();
    const days = data?.signupsByDate.length || 1;
    return Math.round(total / days * 10) / 10;
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => fetchStatistics(selectedDays)}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with date filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">User Statistics</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show last:</span>
          <Select value={selectedDays} onValueChange={setSelectedDays}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{data?.totalUsers || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Today</p>
                <p className="text-2xl font-bold text-green-600">{data?.activeUsersToday || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">New Today</p>
                <p className="text-2xl font-bold text-blue-600">{data?.newUsersToday || 0}</p>
              </div>
              <UserPlus className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold text-purple-600">{data?.newUsersThisWeek || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-xl font-bold">{data?.newUsersThisMonth || 0}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Signups</p>
                <p className="text-xl font-bold">{getTotalSignups()}</p>
              </div>
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Daily</p>
                <p className="text-xl font-bold">{getAverageDailySignups()}</p>
              </div>
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Signups Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.signupsByDate || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => formatDate(value)}
                  formatter={(value) => [value, 'Signups']}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Active Users Today</p>
                  <p className="text-sm text-muted-foreground">Users who updated their profile today</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {data?.activeUsersToday || 0}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">New Signups Today</p>
                  <p className="text-sm text-muted-foreground">Users who joined today</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {data?.newUsersToday || 0}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium">Growth This Week</p>
                  <p className="text-sm text-muted-foreground">New users in the last 7 days</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {data?.newUsersThisWeek || 0}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserStatistics;
