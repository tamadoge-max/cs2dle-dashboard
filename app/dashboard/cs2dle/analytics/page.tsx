import { ArrowLeft, MousePointerClick, BarChart3, Table2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PlayHistoryChart } from "./components/PlayHistoryChart";
import { HourlyActivityChart } from "./components/HourlyActivityChart";
import { HourlyVisitorChart } from "./components/HourlyVisitorChart";
import { DailyVisitorChart } from "./components/DailyVisitorChart";
import { GameStatsChart } from "./components/GameStatsChart";
import { GamePlayerStatsChart } from "./components/GamePlayerStatsChart";
import { UserRegistrationChart } from "./components/UserRegistrationChart";
import { InactiveUsersChart } from "./components/InactiveUsersChart";
import { UserLocationMap } from "./components/UserLocationMap";
import { OverviewCards } from "./components/OverviewCards";
import { TodayGrowthCards } from "./components/TodayGrowthCards";
import { ADTrackingSummaryCards } from "./components/ADTrackingSummaryCards";
import { ADClicksOverTimeChart } from "./components/ADClicksOverTimeChart";
import { ADClicksBySourceChart } from "./components/ADClicksBySourceChart";
import { ADClicksTable } from "./components/ADClicksTable";

const AnalyticsPage = () => {
  return (
    <div className="space-y-6 pt-12">
      <div className="flex items-center justify-center gap-4 mb-8">
        <Image
          src="/images/cs2dle/logo.png"
          alt="CS2DLE Logo"
          width={300}
          height={300}
          className="object-cover rounded-lg"
          quality={100}
        />
      </div>

      <OverviewCards />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="game-activity">Game Activity</TabsTrigger>
          <TabsTrigger value="game-stats">Game Stats</TabsTrigger>
          <TabsTrigger value="visitors">Visitors</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="AD Tracker">AD Tracker</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <TodayGrowthCards />
        </TabsContent>

        <TabsContent value="game-activity" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PlayHistoryChart defaultPeriod="7d" />
            <HourlyActivityChart />
          </div>
        </TabsContent>

        <TabsContent value="game-stats" className="space-y-6 mt-6">
          <GameStatsChart defaultPeriod="7d" />
          <GamePlayerStatsChart defaultPeriod="7d" />
        </TabsContent>

        <TabsContent value="visitors" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DailyVisitorChart defaultPeriod="7d" />
            <HourlyVisitorChart />
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UserRegistrationChart defaultPeriod="7d" />
            <InactiveUsersChart defaultPeriod="7d" inactivityDays={30} />
          </div>
          <div className="grid grid-cols-1 gap-6">
            <UserLocationMap />
          </div>
        </TabsContent>

        <TabsContent value="AD Tracker" className="space-y-6 mt-6">
          {/* Header Section */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <MousePointerClick className="h-8 w-8 text-primary" />
                AD Tracking Analytics
              </h2>
              <p className="text-muted-foreground mt-2">
                Monitor and analyze advertisement exposure and click performance, user engagement, click-through rates, and source attribution
              </p>
            </div>
          </div>

          <Separator />

          {/* Summary Cards */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Performance Overview
            </h3>
            <ADTrackingSummaryCards />
          </div>

          <Separator />

          {/* Charts Section */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Visual Analytics
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ADClicksOverTimeChart defaultPeriod="30d" />
              <ADClicksBySourceChart defaultPeriod="30d" />
            </div>
          </div>

          <Separator />

          {/* Detailed Table */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Table2 className="h-5 w-5 text-muted-foreground" />
              Click Details
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <ADClicksTable defaultPeriod="30d" />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;
