"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  AlertCircle,
  Loader2,
  CheckCircle,
  Copy,
  Mail,
  Search,
  Filter,
  X,
  Bell,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { UserDetailsModal } from "@/components/UserModal/UserDetailsModal";

interface User {
  _id: string;
  email: string;
  name?: string;
  username?: string;
  image?: string;
  steamId?: string;
  tradeLink?: string;
  cryptoAddresses?: {
    bitcoin?: string;
    ethereum?: string;
    litecoin?: string;
  };
  dailyCase?: DailyCase[];
  weeklyPrize?: WeeklyPrize[];
  // Game statistics
  gamesPlayed?: number;
  bestStreak?: number;
  currentStreak?: number;
  score?: number;
  ticket?: number;
  // Account info
  createdAt?: string;
  updatedAt?: string;
  role?: string;
  isGuest?: boolean;
  lastCryptoSetupEmailSent?: string;
  // Calculated fields
  winRate?: number;
}

interface WeeklyPrize {
  id: string;
  active: boolean;
  weekStartDate: string;
  weekEndDate: string;
  claimData?: string;
  receivedData?: string;
  weeklyPrize?: {
    name: string;
    image?: string;
    rarity?: {
      name: string;
      color: string;
    };
    price?: number;
  };
}

interface DailyCase {
  id: string;
  active: boolean;
  claimData?: string;
  receivedData?: string;
  emailSent?: string;
  precase?: {
    name: string;
    image?: string;
    weapon?: {
      name: string;
    };
    category?: {
      name: string;
    };
    rarity?: {
      name: string;
      color: string;
    };
    price?: number;
  };
}

interface UserPrizeCard {
  user: User;
  dailyCase: DailyCase | null;
  prizeIndex: number;
  prizeCount: number;
}

const PrizeWinners = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());
  const [showZeroPrizes, setShowZeroPrizes] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSendMailOpen, setIsSendMailOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingRewardNotify, setSendingRewardNotify] = useState<Set<string>>(
    new Set()
  );

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [cryptoSetFilter, setCryptoSetFilter] = useState<
    "all" | "set" | "not-set"
  >("all");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<
    "all" | "delivered" | "undelivered"
  >("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/cs2dle/rewards/daily-case/users");
      const result = await response.json();

      if (result.success) {
        setUsers(result.data);
      } else {
        setError("Failed to fetch users");
      }
    } catch (err) {
      setError("Error loading users");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDailyCase = async (
    userId: string,
    caseId: string,
    newStatus: boolean
  ) => {
    try {
      setUpdatingUsers((prev) => new Set(prev).add(userId));

      const response = await fetch("/api/cs2dle/rewards/daily-case/active", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          prizeId: caseId,
          newStatus,
        }),
      });

      const result = await response.json();

      if (response.ok && result.message) {
        toast({
          title: "Success",
          description: `Daily case ${newStatus ? "activated" : "deactivated"
            } successfully`,
        });

        // Refresh users data
        await fetchUsers();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update daily case status",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update daily case status",
        variant: "destructive",
      });
    } finally {
      setUpdatingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    try {
      // Handle ISO date strings with timezone offsets
      const date = parseISO(dateString);
      return format(date, "MMM dd, yyyy HH:mm");
    } catch {
      return "Invalid date";
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        toast({
          title: "Success",
          description: "Address copied to clipboard",
        });
        await navigator.clipboard.writeText(text);
        return;
      }

      // Fallback to older method for non-HTTPS or unsupported browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (successful) {
        toast({
          title: "Copied!",
          description: "Address copied to clipboard",
        });
      } else {
        throw new Error("Copy command failed");
      }
    } catch (err) {
      console.error("Copy failed:", err);
      toast({
        title: "Error",
        description:
          "Failed to copy address. Please try selecting and copying manually.",
        variant: "destructive",
      });
    }
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsModalOpen(true);
  };

  const handleSendMailConfirm = async (userId: string) => {
    try {
      const user = users.find((user) => user._id === userId);
      if (!user) {
        toast({
          title: "Error",
          description: "User not found",
          variant: "destructive",
        });
        return;
      }
      setUserDetails(user);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch user details",
        variant: "destructive",
      });
    }
    setIsSendMailOpen(!isSendMailOpen);
  };

  const handleSendMail = async (
    userId: string,
    email: string,
    username: string,
    name: string
  ) => {
    try {
      setSendingEmail(true);
      const response = await fetch("/api/cs2dle/users/mail/crypto-set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          email,
          username,
          name,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Email Sent Successfully!",
          description: `Crypto setup email sent to ${email}`,
        });

        // Refresh users data to update any status changes
        await fetchUsers();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to send email",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
      setIsSendMailOpen(false);
    }
  };

  const handleSendRewardNotification = async (
    userId: string,
    prizeId: string,
    user: User,
    dailyCase: DailyCase
  ) => {
    try {
      // Add to sending set
      setSendingRewardNotify((prev) => new Set(prev).add(prizeId));

      // Prepare item data
      const selectedItem = {
        name: dailyCase.precase?.name || "Unknown Item",
        image: dailyCase.precase?.image || "",
        price: dailyCase.precase?.price || 0,
      };

      const response = await fetch("/api/cs2dle/users/mail/reward-notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          email: user.email,
          username: user.username,
          name: user.name,
          prizeId,
          selectedItem,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Notification Sent!",
          description: `Reward notification email sent to ${user.email}`,
        });

        // Refresh users data to update email status
        await fetchUsers();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to send notification",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending reward notification:", error);
      toast({
        title: "Error",
        description: "Failed to send notification. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Remove from sending set
      setSendingRewardNotify((prev) => {
        const newSet = new Set(prev);
        newSet.delete(prizeId);
        return newSet;
      });
    }
  };

  // Helper function to check if user has crypto addresses set
  const hasCryptoAddresses = (user: User) => {
    return (
      user.cryptoAddresses &&
      (user.cryptoAddresses.bitcoin ||
        user.cryptoAddresses.ethereum ||
        user.cryptoAddresses.litecoin)
    );
  };

  // Helper function to check if user has undelivered items
  const hasUndeliveredItems = (user: User) => {
    if (!user.dailyCase || user.dailyCase.length === 0) return false;
    return user.dailyCase.some((caseItem) => !caseItem.active);
  };

  // Helper function to check if user has delivered items
  const hasDeliveredItems = (user: User) => {
    if (!user.dailyCase || user.dailyCase.length === 0) return false;
    return user.dailyCase.some((caseItem) => caseItem.active);
  };

  // Helper function to check if search query matches user
  const matchesSearchQuery = (user: User, query: string) => {
    if (!query) return true;
    const searchLower = query.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user._id.toLowerCase().includes(searchLower)
    );
  };

  // Filter users and their daily cases based on all filter states
  const filteredUsers = users
    .filter((user) => {
      // Search filter
      if (!matchesSearchQuery(user, searchQuery)) return false;

      // Crypto set filter
      if (cryptoSetFilter === "set" && !hasCryptoAddresses(user)) return false;
      if (cryptoSetFilter === "not-set" && hasCryptoAddresses(user))
        return false;

      // Delivery status filter
      if (deliveryStatusFilter === "undelivered" && hasDeliveredItems(user))
        return false;
      if (deliveryStatusFilter === "delivered" && !hasDeliveredItems(user))
        return false;

      return true;
    })
    .map((user) => {
      if (!showZeroPrizes) {
        // When toggle is off, filter out $0 prizes from each user's daily cases
        const filteredDailyCases =
          user.dailyCase?.filter(
            (dailyCase) =>
              dailyCase.precase?.price !== 0 &&
              dailyCase.precase?.price !== undefined
          ) || [];

        return {
          ...user,
          dailyCase: filteredDailyCases,
        };
      }
      // When toggle is on, show all users with all their daily cases
      return user;
    })
    .filter((user) => {
      if (!showZeroPrizes) {
        // Hide users who have no daily cases after filtering out $0 prizes
        return user.dailyCase && user.dailyCase.length > 0;
      }
      // When toggle is on, show all users
      return true;
    });

  // Calculate statistics for filtered users
  const totalUsers = users.length; // Always show total users count
  const totalDailyCases = filteredUsers.reduce(
    (sum, user) => sum + (user.dailyCase?.length || 0),
    0
  );
  const activeCases = filteredUsers.reduce(
    (sum, user) => sum + (user.dailyCase?.filter((c) => c.active).length || 0),
    0
  );
  const totalValue = filteredUsers
    .reduce(
      (sum, user) =>
        sum +
        (user.dailyCase?.reduce(
          (caseSum, dailyCase) => caseSum + (dailyCase.precase?.price || 0),
          0
        ) || 0),
      0
    )
    .toFixed(2);

  // Build card entries so each prize gets its own card
  const userPrizeCards: UserPrizeCard[] = filteredUsers.flatMap<UserPrizeCard>(
    (user) => {
      if (user.dailyCase && user.dailyCase.length > 0) {
        return user.dailyCase.map((dailyCase, index) => ({
          user,
          dailyCase,
          prizeIndex: index,
          prizeCount: user.dailyCase?.length || 0,
        }));
      }

      return [
        {
          user,
          dailyCase: null,
          prizeIndex: 0,
          prizeCount: 0,
        },
      ];
    }
  );

  const sortedPrizeCards = [...userPrizeCards].sort((a, b) => {
    const getTimestamp = (card: UserPrizeCard) => {
      if (card.dailyCase?.claimData) {
        const date = new Date(card.dailyCase.claimData);
        return isNaN(date.getTime()) ? -Infinity : date.getTime();
      }
      return -Infinity;
    };

    return getTimestamp(b) - getTimestamp(a);
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center gap-4 mb-8">
          <Image
            src="/images/cs2dle/logo.png"
            alt="CS2DLE Logo"
            width={300}
            height={300}
          />
        </div>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Prize Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="ml-3">
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-8 h-8 rounded" />
                        <div>
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Skeleton className="h-8 w-20" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <Image
          src="/images/cs2dle/logo.png"
          alt="CS2DLE Logo"
          width={300}
          height={300}
        />
      </div>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Filters</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, username, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Crypto Set Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Crypto Set</Label>
                <Select
                  value={cryptoSetFilter}
                  onValueChange={(value: "all" | "set" | "not-set") =>
                    setCryptoSetFilter(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select crypto status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="set">✅ Crypto Set</SelectItem>
                    <SelectItem value="not-set">❌ Crypto Not Set</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Delivery Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Delivery Status</Label>
                <Select
                  value={deliveryStatusFilter}
                  onValueChange={(value: "all" | "delivered" | "undelivered") =>
                    setDeliveryStatusFilter(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select delivery status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="delivered">
                      Has Delivered Items
                    </SelectItem>
                    <SelectItem value="undelivered">
                      Has Undelivered Items
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Zero Prizes Toggle */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Prize Value</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-zero-prizes"
                    checked={showZeroPrizes}
                    onCheckedChange={setShowZeroPrizes}
                  />
                  <Label htmlFor="show-zero-prizes" className="text-sm">
                    Show $0 prizes
                  </Label>
                </div>
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setCryptoSetFilter("all");
                  setDeliveryStatusFilter("all");
                  setShowZeroPrizes(false);
                }}
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {searchQuery ||
              cryptoSetFilter !== "all" ||
              deliveryStatusFilter !== "all" ||
              !showZeroPrizes
              ? `Showing ${filteredUsers.length} of ${users.length} users`
              : `Showing all ${users.length} users`}
            {searchQuery && ` (filtered by "${searchQuery}")`}
            {cryptoSetFilter !== "all" &&
              ` (${cryptoSetFilter === "set" ? "crypto set" : "crypto not set"
              })`}
            {deliveryStatusFilter !== "all" &&
              ` (${deliveryStatusFilter === "delivered"
                ? "has delivered items"
                : "has undelivered items"
              })`}
            {!showZeroPrizes && " (hiding $0 prizes)"}
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-blue-600">{totalUsers}</div>
          <div className="text-sm text-muted-foreground">Total Users</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-green-600">
            {totalDailyCases}
          </div>
          <div className="text-sm text-muted-foreground">Total Daily Cases</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-purple-600">
            {activeCases}
          </div>
          <div className="text-sm text-muted-foreground">Active Cases</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-orange-600">
            ${totalValue}
          </div>
          <div className="text-sm text-muted-foreground">Total Value</div>
        </Card>
      </div>

      {/* Users Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedPrizeCards.map(({ user, dailyCase, prizeIndex, prizeCount }) => {
          const prizeName = dailyCase?.precase?.name || `Item ${dailyCase?.id || ""}`;
          const claimedLabel = dailyCase?.claimData
            ? formatDate(dailyCase.claimData)
            : "pending";
          const receivedLabel = dailyCase?.receivedData
            ? formatDate(dailyCase.receivedData)
            : "pending";

          return (
            <Card
              key={`${user._id}-${dailyCase ? dailyCase.id : "no-prize"}`}
              className="p-4 space-y-4"
            >
              <div className="flex flex-col md:flex-row flex-wrap items-start justify-between gap-4">
                <div className="flex md:items-start items-center gap-3">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name || user.username || "User"}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                      {(user.name || user.username || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-1">
                    <div
                      className="text-lg font-semibold text-gray-100 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleUserClick(user._id)}
                    >
                      {(user.name || user.username || "Unknown User").slice(0, 10)}...
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {user._id.slice(-8)}
                      {prizeCount > 1 && dailyCase && (
                        <span className="ml-2 text-blue-400">
                          ({prizeIndex + 1}/{prizeCount})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.email}
                    </div>
                    {user.steamId && (
                      <div className="text-xs text-muted-foreground">
                        Steam: {user.steamId}
                      </div>
                    )}
                    {user.tradeLink && (
                      <a
                        href={user.tradeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline"
                      >
                        Trade Link
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex md:items-start items-center gap-3 text-right">
                  {dailyCase ? (
                    <div className="flex flex-col items-center justify-between min-w-[160px]" >
                      <div className="flex items-center gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-white truncate">
                            {prizeName.slice(0, 10)}...
                          </div>
                          <div
                            className="text-xs"
                            style={{
                              color: dailyCase.precase?.rarity?.color || "#b0c3d9",
                            }}
                          >
                            {dailyCase.precase?.weapon?.name} •{" "}
                            {dailyCase.precase?.category?.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Price: ${dailyCase.precase?.price?.toFixed(2)}
                          </div>
                        </div>
                        {dailyCase.precase?.image && (
                          <Image
                            src={dailyCase.precase.image}
                            alt={prizeName}
                            width={72}
                            height={72}
                            className="w-16 h-16 rounded object-contain"
                          />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground text-right mt-3">
                        <div>Claimed: {claimedLabel}</div>
                        <div>Received: {receivedLabel}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      No prizes assigned
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  {user.cryptoAddresses &&
                    Object.values(user.cryptoAddresses).some(Boolean) ? (
                    Object.entries(user.cryptoAddresses).map(
                      ([key, value], index) => {
                        if (!value) return null;
                        return (
                          <div
                            key={`${user._id}-${key}-${index}`}
                            className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-xs"
                          >
                            <Image
                              src={`/images/icon/${key === "bitcoin"
                                ? "btc"
                                : key === "ethereum"
                                  ? "eth"
                                  : "ltc"
                                }.svg`}
                              alt={key}
                              width={14}
                              height={14}
                            />
                            <span className="capitalize">{key}</span>
                            <span className="text-green-400">
                              {value.length > 4
                                ? `${value.slice(0, 2)}...${value.slice(-2)}`
                                : value}
                            </span>
                            <button
                              className="text-xs text-blue-300 hover:underline"
                              onClick={() => copyToClipboard(value)}
                            >
                              Copy
                            </button>
                          </div>
                        );
                      }
                    )
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs">❌ not set</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleSendMailConfirm(user._id)}
                      >
                        <Mail className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={dailyCase?.emailSent ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {dailyCase?.emailSent === "CR_Remind"
                      ? "CR_Remind"
                      : dailyCase?.emailSent === "CR_Set_won"
                        ? "CR_Set_won"
                        : dailyCase?.emailSent === "Delivered"
                          ? "Delivered"
                          : "None"}
                  </Badge>
                  {dailyCase && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() =>
                        handleSendRewardNotification(
                          user._id,
                          dailyCase.id,
                          user,
                          dailyCase
                        )
                      }
                      disabled={
                        dailyCase ? sendingRewardNotify.has(dailyCase.id) : false
                      }
                    >
                      {dailyCase && sendingRewardNotify.has(dailyCase.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <div>
                  {dailyCase ? (
                    !dailyCase.active ? (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() =>
                          handleToggleDailyCase(
                            user._id,
                            dailyCase.id,
                            !dailyCase.active
                          )
                        }
                        disabled={updatingUsers.has(user._id)}
                        className="text-xs"
                      >
                        {updatingUsers.has(user._id) ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Delivered
                          </>
                        )}
                      </Button>
                    ) : (
                      <Badge variant="default" className="text-xs px-3 py-1">
                        Delivered
                      </Badge>
                    )
                  ) : (
                    <Badge variant="outline" className="text-xs px-3 py-1">
                      No prize
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={selectedUserId}
      />
      <Dialog open={isSendMailOpen} onOpenChange={setIsSendMailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2 w-full justify-center">
                Send email to{" "}
                {userDetails?.name ||
                  userDetails?.username ||
                  userDetails?.email ||
                  "Unknown User"}
                <Image
                  src={userDetails?.image || ""}
                  alt={userDetails?.name || userDetails?.username || "User"}
                  width={20}
                  height={20}
                  className="w-5 h-5 object-cover rounded-full"
                />
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p>
              Are you looking to send a message encouraging users to set up a
              cryptocurrency address to receive rewards?
            </p>
            <p className="text-xs text-muted-foreground">
              Note: This user has not set up crypto addresses, so you cannot
              send cryptocurrency rewards to them.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSendMailOpen(false)}
              disabled={sendingEmail}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() =>
                handleSendMail(
                  userDetails?._id || "",
                  userDetails?.email || "",
                  userDetails?.username || "",
                  userDetails?.name || ""
                )
              }
              disabled={sendingEmail}
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Email"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrizeWinners;
