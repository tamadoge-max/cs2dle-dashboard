"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft,
  ChevronRight,
  Trophy,
  Medal,
  Award,
  Plus,
  Calendar,
  Gift,
  BarChart3,
  TrendingUp,
  Loader2,
  Bell,
} from "lucide-react";
import Image from "next/image";
import LeaderboardSkeleton from "@/components/LeaderboardSkeleton";
import { AddMonthlyProductModal } from "./components/AddMonthlyProductModal";
import { ViewMonthlyPrizesModal } from "./components/ViewMonthlyPrizesModal";
import { UserDetailsModal } from "@/components/UserModal/UserDetailsModal";
import { PrizeHistoryModal } from "./components/PrizeHistoryModal";
import { toast } from "@/hooks/use-toast";

interface LeaderboardUser {
  _id: string;
  username: string;
  avatar: string;
}

interface MonthlyPrize {
  _id: string;
  name: string;
  image?: string;
  price?: number;
  monthYear: string;
  rarity?: {
    name: string;
    color: string;
  };
  status: "active" | "inactive";
  assigned?: boolean;
  assignedTo?: string;
  assignedAt?: Date;
  delivered?: boolean;
  deliveredAt?: string;
}

interface LeaderboardEntry {
  position: number;
  user: LeaderboardUser;
  bestStreak: number;
  currentStreak: number;
  guesses: number;
  score: number;
  tickets: number;
  winRate: number;
  monthlyPrize?: MonthlyPrize;
  allPrizes?: MonthlyPrize[]; // For overall leaderboard - all prizes earned
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface LeaderboardResponse {
  success: boolean;
  data: LeaderboardEntry[];
  pagination: PaginationInfo;
}

const LeaderboardPage = () => {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [leaderboardType, setLeaderboardType] = useState<"monthly" | "overall">(
    "monthly"
  );
  const [isToggling, setIsToggling] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [viewPrizesModalOpen, setViewPrizesModalOpen] = useState(false);
  const [userDetailsModalOpen, setUserDetailsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [monthlyPrizes, setMonthlyPrizes] = useState<MonthlyPrize[]>([]);
  const [currentMonth, setCurrentMonth] = useState<string>("");
  const [assigningPrizes, setAssigningPrizes] = useState<Set<string>>(
    new Set()
  );
  const [markingDelivered, setMarkingDelivered] = useState<Set<string>>(
    new Set()
  );
  const [sendingReminder, setSendingReminder] = useState<Set<string>>(
    new Set()
  );
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    type: "assign" | "remove" | null;
    userId: string | null;
    prizeId: string | null;
    prizeName: string | null;
    userName: string | null;
  }>({
    isOpen: false,
    type: null,
    userId: null,
    prizeId: null,
    prizeName: null,
    userName: null,
  });
  const [prizeHistoryModalOpen, setPrizeHistoryModalOpen] = useState(false);

  const fetchLeaderboard = async (
    page: number,
    type: "monthly" | "overall" = leaderboardType
  ) => {
    try {
      setLoading(true);
      setError(null);

      const endpoint =
        type === "overall"
          ? "/api/cs2dle/leaderboard/all"
          : "/api/cs2dle/leaderboard";

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      // Add month parameter for monthly leaderboard
      if (type === "monthly" && selectedMonth) {
        params.append("month", selectedMonth);
      }

      const response = await fetch(`${endpoint}?${params.toString()}`);
      const result: LeaderboardResponse = await response.json();
      console.log(result);
      if (result.success) {
        setData(result);
      } else {
        setError("Failed to fetch leaderboard data");
      }
    } catch (err) {
      setError("An error occurred while fetching data");
      console.error("Leaderboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableMonths = async () => {
    try {
      const response = await fetch("/api/cs2dle/leaderboard/available-months");
      const result = await response.json();
      if (result.success) {
        setAvailableMonths(result.months);
        // Set default to current month if available, otherwise first month
        if (result.months.length > 0) {
          const currentMonth = getCurrentMonth();
          const defaultMonth = result.months.includes(currentMonth)
            ? currentMonth
            : result.months[0];
          setSelectedMonth(defaultMonth);
        }
      }
    } catch (err) {
      console.error("Error fetching available months:", err);
    }
  };

  const fetchMonthlyPrizes = async () => {
    try {
      const response = await fetch("/api/cs2dle/rewards/monthly-prize");
      const result = await response.json();
      if (result.monthlyPrizes) {
        setMonthlyPrizes(result.monthlyPrizes);
      }
    } catch (err) {
      console.error("Error fetching monthly prizes:", err);
    }
  };

  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const formatMonthDisplay = (month: string) => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  const showConfirmationDialog = (
    type: "assign" | "remove",
    userId: string,
    prizeId: string | null,
    prizeName: string,
    userName: string
  ) => {
    setConfirmationDialog({
      isOpen: true,
      type,
      userId,
      prizeId,
      prizeName,
      userName,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmationDialog.userId || !confirmationDialog.type) return;

    const { userId, type, prizeId } = confirmationDialog;

    setAssigningPrizes((prev) => new Set(prev).add(userId));
    setConfirmationDialog((prev) => ({ ...prev, isOpen: false }));

    try {
      if (type === "assign" && prizeId) {
        const targetMonth = selectedMonth || currentMonth;
        const response = await fetch(
          "/api/cs2dle/rewards/monthly-prize/users",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId,
              monthlyPrizeId: prizeId,
              monthYear: targetMonth,
            }),
          }
        );

        if (response.ok) {
          fetchLeaderboard(currentPage);
          fetchMonthlyPrizes();
          toast({
            title: "Prize Assigned",
            description:
              "Monthly prize has been successfully assigned to the user.",
          });
        } else {
          console.error("Failed to assign monthly prize");
          toast({
            title: "Error",
            description: "Failed to assign monthly prize. Please try again.",
            variant: "destructive",
          });
        }
      } else if (type === "remove") {
        const targetMonth = selectedMonth || currentMonth;
        const response = await fetch(
          "/api/cs2dle/rewards/monthly-prize/users",
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId,
              monthYear: targetMonth,
            }),
          }
        );

        if (response.ok) {
          fetchLeaderboard(currentPage);
          fetchMonthlyPrizes();
          toast({
            title: "Prize Removed",
            description:
              "Monthly prize has been successfully removed from the user.",
          });
        } else {
          console.error("Failed to remove monthly prize");
          toast({
            title: "Error",
            description: "Failed to remove monthly prize. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      console.error(
        `Error ${type === "assign" ? "assigning" : "removing"} monthly prize:`,
        err
      );
      toast({
        title: "Error",
        description: `An error occurred while ${
          type === "assign" ? "assigning" : "removing"
        } the prize. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setAssigningPrizes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleCancelAction = () => {
    setConfirmationDialog({
      isOpen: false,
      type: null,
      userId: null,
      prizeId: null,
      prizeName: null,
      userName: null,
    });
  };

  const handleMarkAsDelivered = async (userId: string, monthYear: string) => {
    if (markingDelivered.has(userId)) return;

    setMarkingDelivered((prev) => new Set(prev).add(userId));

    try {
      const response = await fetch(
        "/api/cs2dle/rewards/monthly-prize/users",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            monthYear,
          }),
        }
      );

      if (response.ok) {
        fetchLeaderboard(currentPage);
        toast({
          title: "Prize Marked as Delivered",
          description:
            "Monthly prize has been successfully marked as delivered.",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to mark prize as delivered. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error marking prize as delivered:", err);
      toast({
        title: "Error",
        description: "An error occurred while marking the prize as delivered. Please try again.",
        variant: "destructive",
      });
    } finally {
      setMarkingDelivered((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleSendReminder = async (userId: string, monthYear: string) => {
    if (sendingReminder.has(userId)) return;

    setSendingReminder((prev) => new Set(prev).add(userId));

    try {
      const response = await fetch(
        "/api/cs2dle/rewards/monthly-prize/users",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            monthYear,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Reminder Email Sent",
          description: "Reminder email has been successfully sent to the user.",
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to send reminder email. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error sending reminder email:", err);
      toast({
        title: "Error",
        description: "An error occurred while sending the reminder email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingReminder((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleOpenPrizeHistory = () => {
    setPrizeHistoryModalOpen(true);
  };

  const getCurrentMonthPrizes = (month?: string) => {
    const targetMonth = month || selectedMonth || currentMonth;
    return monthlyPrizes
      .filter(
        (prize) => prize.monthYear === targetMonth && prize.status === "active"
      )
      .sort((a, b) => (b.price || 0) - (a.price || 0)); // Sort by price descending
  };

  const getPrizeForPosition = (position: number, month?: string) => {
    const sortedPrizes = getCurrentMonthPrizes(month);
    return sortedPrizes[position - 1] || null; // position 1 = index 0, etc.
  };

  const handleAvatarClick = (userId: string) => {
    setSelectedUserId(userId);
    setUserDetailsModalOpen(true);
  };

  const handleLeaderboardTypeChange = async (type: "monthly" | "overall") => {
    if (isToggling || type === leaderboardType) return; // Prevent multiple clicks and same type

    setIsToggling(true);
    setLeaderboardType(type);
    setCurrentPage(1); // Reset to first page when switching types

    try {
      await fetchLeaderboard(1, type);
    } finally {
      setIsToggling(false);
    }
  };

  const handleMonthChange = async (month: string) => {
    if (month === selectedMonth && leaderboardType === "monthly") return; // Prevent unnecessary requests

    setSelectedMonth(month);
    setLeaderboardType("monthly");
    setCurrentPage(1); // Reset to first page when changing month

    await fetchLeaderboard(1, "monthly");
  };

  useEffect(() => {
    fetchAvailableMonths();
    fetchMonthlyPrizes();
    setCurrentMonth(getCurrentMonth());
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      fetchLeaderboard(currentPage, leaderboardType);
    }
  }, [currentPage, leaderboardType, selectedMonth]);

  const getPositionIcon = (position: number) => {
    if (position === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (position === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (position === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getPositionBadge = (position: number) => {
    if (position === 1)
      return <Badge className="bg-yellow-500 text-white">1st</Badge>;
    if (position === 2)
      return <Badge className="bg-gray-400 text-white">2nd</Badge>;
    if (position === 3)
      return <Badge className="bg-amber-600 text-white">3rd</Badge>;
    return <Badge variant="secondary">#{position}</Badge>;
  };

  if (loading && !data) {
    return <LeaderboardSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => fetchLeaderboard(currentPage)}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-center gap-4 mb-8">
        <Image
          src="/images/cs2dle/logo.png"
          alt="CS2DLE Logo"
          width={300}
          height={300}
        />
      </div>
      <Card>
        <CardContent className="!p-0">
          {data && (
            <>
              {/* Monthly Prize Controls */}
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold">Leaderboard</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLeaderboardTypeChange("overall")}
                      disabled={isToggling}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        leaderboardType === "overall"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      } ${
                        isToggling
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                    >
                      {isToggling && leaderboardType === "overall" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BarChart3 className="h-4 w-4" />
                      )}
                      Overall
                    </button>

                    {availableMonths.length > 0 && (
                      <>
                        {availableMonths.map((month) => (
                          <button
                            key={month}
                            onClick={() => {
                              setLeaderboardType("monthly");
                              handleMonthChange(month);
                            }}
                            disabled={isToggling}
                            className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                              leaderboardType === "monthly" &&
                              selectedMonth === month
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            } ${
                              isToggling
                                ? "opacity-50 cursor-not-allowed"
                                : "cursor-pointer"
                            }`}
                          >
                            {formatMonthDisplay(month)}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setAddProductModalOpen(true)}
                    className="bg-gradient-to-r text-white from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Monthly Prize
                  </Button>
                  <Button
                    onClick={() => setViewPrizesModalOpen(true)}
                    variant="outline"
                    className="border-blue-200 text-blue-"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View Monthly Prizes
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-gradient-to-r text-white from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    onClick={handleOpenPrizeHistory}
                    title="View prize history"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View All Winners
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">Best Streak</TableHead>
                    <TableHead className="text-center">
                      Current Streak
                    </TableHead>
                    <TableHead className="text-center">Games Played</TableHead>
                    <TableHead className="text-center">
                      Correct guesses
                    </TableHead>
                    <TableHead className="text-center">Win Rate</TableHead>
                    <TableHead className="text-center">
                      {leaderboardType === "monthly"
                        ? selectedMonth
                          ? `${formatMonthDisplay(selectedMonth)} Points`
                          : "Monthly Points"
                        : "Total Points"}
                    </TableHead>
                    <TableHead className="text-center">Prize</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((entry) => (
                    <TableRow key={entry.user._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getPositionIcon(entry.position)}
                          {getPositionBadge(entry.position)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition-all duration-200"
                            onClick={() => handleAvatarClick(entry.user._id)}
                          >
                            <AvatarImage
                              src={entry.user.avatar}
                              alt={entry.user.username}
                            />
                            <AvatarFallback>
                              {entry.user.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {entry.user.username}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">
                          {entry.bestStreak}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono">
                          {entry.currentStreak}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono">{entry.guesses}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono">{entry.tickets}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="font-mono bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
                        >
                          {(entry.winRate * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="font-mono bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                        >
                          {entry.score.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {leaderboardType === "monthly" ? (
                          (() => {
                            const assignedPrize = entry.monthlyPrize;
                            const positionPrize = getPrizeForPosition(
                              entry.position,
                              selectedMonth
                            );
                            const isAssigning = assigningPrizes.has(
                              entry.user._id
                            );

                            // If user has an assigned prize, show it with click to remove
                            if (assignedPrize) {
                              return (
                                <div className="flex items-center gap-2">
                                  <div
                                    className="flex items-center justify-center gap-2 cursor-pointer p-2 rounded-md transition-colors"
                                    onClick={() =>
                                      !isAssigning &&
                                      showConfirmationDialog(
                                        "remove",
                                        entry.user._id,
                                        null,
                                        assignedPrize.name,
                                        entry.user.username
                                      )
                                    }
                                    title="Click to remove prize"
                                  >
                                    {assignedPrize.image ? (
                                      <Image
                                        src={assignedPrize.image}
                                        alt={assignedPrize.name}
                                        width={50}
                                        height={50}
                                        className="rounded-sm object-cover"
                                      />
                                    ) : (
                                      <div
                                        className="w-8 h-8 rounded-sm"
                                        style={{
                                          backgroundColor:
                                            assignedPrize.rarity?.color ||
                                            "#b0c3d9",
                                        }}
                                      />
                                    )}
                                    <div className="text-left">
                                      <div className="text-sm font-medium truncate max-w-24">
                                        {assignedPrize.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        ${assignedPrize.price}
                                      </div>
                                      {isAssigning && (
                                        <div className="text-xs text-blue-500">
                                          Removing...
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            // If no assigned prize but position prize exists, show it as clickable
                            if (positionPrize) {
                              return (
                                <div className="flex items-center gap-2">
                                  <div
                                    className="flex items-center justify-center gap-2 cursor-pointer p-2 rounded-md transition-colors opacity-60 hover:opacity-100"
                                    onClick={() =>
                                      !isAssigning &&
                                      showConfirmationDialog(
                                        "assign",
                                        entry.user._id,
                                        positionPrize._id,
                                        positionPrize.name,
                                        entry.user.username
                                      )
                                    }
                                    title="Click to assign prize"
                                  >
                                    {positionPrize.image ? (
                                      <Image
                                        src={positionPrize.image}
                                        alt={positionPrize.name}
                                        width={50}
                                        height={50}
                                        className="rounded-sm object-cover"
                                      />
                                    ) : (
                                      <div
                                        className="w-8 h-8 rounded-sm"
                                        style={{
                                          backgroundColor:
                                            positionPrize.rarity?.color ||
                                            "#b0c3d9",
                                        }}
                                      />
                                    )}
                                    <div className="text-left">
                                      <div className="text-sm font-medium truncate max-w-24">
                                        {positionPrize.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        ${positionPrize.price}
                                      </div>
                                      {isAssigning && (
                                        <div className="text-xs text-blue-500">
                                          Assigning...
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <span className="text-sm text-gray-500">
                                No prize available
                              </span>
                            );
                          })()
                        ) : leaderboardType === "overall" ? (
                          (() => {
                            const userPrizes = entry.allPrizes || [];

                            if (userPrizes.length === 0) {
                              return (
                                <span className="text-sm text-gray-500">
                                  No prizes
                                </span>
                              );
                            }

                            return (
                              <div className="w-48">
                                <Select>
                                  <SelectTrigger className="h-8 text-xs">
                                    <div className="flex items-center gap-2">
                                      <Gift className="h-3 w-3" />
                                      <SelectValue
                                        placeholder={`${
                                          userPrizes.length
                                        } prize${
                                          userPrizes.length !== 1 ? "s" : ""
                                        }`}
                                      />
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent className="pl-0">
                                    {userPrizes.map((prize, index) => (
                                      <SelectItem
                                        key={prize._id || index}
                                        value={prize._id || index.toString()}
                                        disabled
                                        className="disabled:!opacity-100"
                                      >
                                        <div className="flex items-center gap-2">
                                          {prize.image ? (
                                            <Image
                                              src={prize.image}
                                              alt={prize.name}
                                              width={50}
                                              height={50}
                                              className="rounded-sm object-cover"
                                            />
                                          ) : (
                                            <div
                                              className="w-5 h-5 rounded-sm"
                                              style={{
                                                backgroundColor:
                                                  prize.rarity?.color ||
                                                  "#b0c3d9",
                                              }}
                                            />
                                          )}
                                          <div className="flex flex-col">
                                            <span className="text-xs font-medium">
                                              {prize.name}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              {prize.monthYear} • ${prize.price}
                                            </span>
                                          </div>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {leaderboardType === "monthly" && entry.monthlyPrize ? (
                            <>
                              {!entry.monthlyPrize.delivered && (
                                <Button
                                  onClick={() =>
                                    handleSendReminder(
                                      entry.user._id,
                                      entry.monthlyPrize!.monthYear
                                    )
                                  }
                                  disabled={sendingReminder.has(entry.user._id)}
                                  variant="outline"
                                  size="sm"
                                  title="Send reminder email"
                                >
                                  {sendingReminder.has(entry.user._id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Bell className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                onClick={() =>
                                  handleMarkAsDelivered(
                                    entry.user._id,
                                    entry.monthlyPrize!.monthYear
                                  )
                                }
                                disabled={
                                  entry.monthlyPrize.delivered ||
                                  markingDelivered.has(entry.user._id)
                                }
                                variant={
                                  entry.monthlyPrize.delivered
                                    ? "secondary"
                                    : "default"
                                }
                                size="sm"
                                className={
                                  entry.monthlyPrize.delivered
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : ""
                                }
                              >
                                {markingDelivered.has(entry.user._id) ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Marking...
                                  </>
                                ) : entry.monthlyPrize.delivered ? (
                                  "Delivered"
                                ) : (
                                  "Mark Delivered"
                                )}
                              </Button>
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center mt-6 mb-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={!data.pagination.hasPrevPage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {(() => {
                        const totalPages = data.pagination.totalPages;
                        const maxVisiblePages = 5;
                        let startPage = Math.max(
                          1,
                          currentPage - Math.floor(maxVisiblePages / 2)
                        );
                        let endPage = Math.min(
                          totalPages,
                          startPage + maxVisiblePages - 1
                        );

                        // Adjust start page if we're near the end
                        if (endPage - startPage + 1 < maxVisiblePages) {
                          startPage = Math.max(
                            1,
                            endPage - maxVisiblePages + 1
                          );
                        }

                        const pages = [];
                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <Button
                              key={i}
                              variant={
                                i === currentPage ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(i)}
                              className="w-8 h-8 p-0"
                            >
                              {i}
                            </Button>
                          );
                        }
                        return pages;
                      })()}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={!data.pagination.hasNextPage}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddMonthlyProductModal
        isOpen={addProductModalOpen}
        onClose={() => setAddProductModalOpen(false)}
        onSuccess={() => setAddProductModalOpen(false)}
      />

      <ViewMonthlyPrizesModal
        isOpen={viewPrizesModalOpen}
        onClose={() => setViewPrizesModalOpen(false)}
        onDataChange={() => {
          fetchLeaderboard(currentPage);
          fetchMonthlyPrizes();
        }}
      />

      <UserDetailsModal
        isOpen={userDetailsModalOpen}
        onClose={() => {
          setUserDetailsModalOpen(false);
          setSelectedUserId(null);
        }}
        userId={selectedUserId}
      />

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmationDialog.isOpen}
        onOpenChange={handleCancelAction}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmationDialog.type === "assign"
                ? "Assign Prize"
                : "Remove Prize"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationDialog.type === "assign" ? (
                <>
                  Are you sure you want to assign the prize{" "}
                  <strong>"{confirmationDialog.prizeName}"</strong> to{" "}
                  <strong>"{confirmationDialog.userName}"</strong>?
                  <br />
                  <br />
                  This action will assign the monthly prize to the user and mark
                  it as assigned.
                </>
              ) : (
                <>
                  Are you sure you want to remove the prize{" "}
                  <strong>"{confirmationDialog.prizeName}"</strong> from{" "}
                  <strong>"{confirmationDialog.userName}"</strong>?
                  <br />
                  <br />
                  This action will unassign the monthly prize from the user and
                  make it available for assignment again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAction}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={
                confirmationDialog.type === "remove"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {confirmationDialog.type === "assign"
                ? "Assign Prize"
                : "Remove Prize"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prize History Modal */}
      <PrizeHistoryModal
        isOpen={prizeHistoryModalOpen}
        onClose={() => setPrizeHistoryModalOpen(false)}
      />
    </div>
  );
};

export default LeaderboardPage;
