"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Mail,
  Calendar,
  Trophy,
  Target,
  TrendingUp,
  Gift,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import Image from "next/image";
import { UserDetailedStatsModal } from "./UserDetailedStatsModal";
import { UserRewardDetailsModal } from "./UserRewardDetailsModal";

interface UserDetails {
  _id: string;
  email: string;
  name?: string;
  username?: string;
  image?: string;
  steamId?: string;
  tradeLink?: string;
  discordName?: string;
  cryptoAddresses?: {
    bitcoin?: string;
    ethereum?: string;
    litecoin?: string;
  };
  dailyCase?: {
    total: number;
    valuable: number;
    zeroValue: number;
  };
  weeklyPrize?: number;
  monthlyPrize?: number;
  gamesPlayed?: number;
  bestStreak?: number;
  currentStreak?: number;
  score?: number;
  ticket?: number;
  createdAt?: string;
  updatedAt?: string;
  role?: string;
  isGuest?: boolean;
  winRate?: number;
  emailVerified?: boolean;
}

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

export const UserDetailsModal = ({
  isOpen,
  onClose,
  userId,
}: UserDetailsModalProps) => {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [detailedStatsModalOpen, setDetailedStatsModalOpen] = useState(false);
  const [rewardDetailsModalOpen, setRewardDetailsModalOpen] = useState(false);
  const [sendingCryptoEmail, setSendingCryptoEmail] = useState(false);

  const fetchUserDetails = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/cs2dle/users/${userId}`);
      const result = await response.json();

      if (result.success) {
        setUserDetails(result.data);
      } else {
        setError("Failed to fetch user details");
      }
    } catch (err) {
      setError("An error occurred while fetching user details");
      console.error("User details fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        title: "Copied!",
        description: `${field} copied to clipboard`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatAddress = (address?: string) => {
    if (!address) return "N/A";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const hasWalletAddresses = Boolean(
    userDetails?.cryptoAddresses?.bitcoin ||
      userDetails?.cryptoAddresses?.ethereum ||
      userDetails?.cryptoAddresses?.litecoin
  );

  const sendCryptoSetupEmail = async () => {
    if (!userId || !userDetails?.email) return;

    try {
      setSendingCryptoEmail(true);
      const response = await fetch("/api/cs2dle/users/mail/crypto-set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          email: userDetails.email,
          username: userDetails.username,
          name: userDetails.name,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to send email");
      }

      toast({
        title: "Email sent",
        description: "User has been notified to set up their wallet address.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setSendingCryptoEmail(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails();
    }
  }, [isOpen, userId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchUserDetails}>Try Again</Button>
          </div>
        )}

        {userDetails && !loading && (
          <div className="space-y-6">
            {/* User Header */}
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <Avatar className="h-16 w-16">
                <AvatarImage src={userDetails.image} alt={userDetails.name} />
                <AvatarFallback className="text-lg">
                  {userDetails.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">
                  {userDetails.name || userDetails.username}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {userDetails.email}
                </p>
                <div className="flex gap-2 mt-2">
                  {userDetails.isGuest && (
                    <Badge variant="secondary">Guest</Badge>
                  )}
                  {userDetails.role && (
                    <Badge variant="outline">{userDetails.role}</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Game Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Game Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {userDetails.score?.toLocaleString() || 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Total Score
                      </div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {userDetails.gamesPlayed || 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Games Played
                      </div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {userDetails.bestStreak || 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Best Streak
                      </div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {userDetails.currentStreak || 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Current Streak
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex justify-between items-center gap-5">
                      <span className="text-sm font-medium">Win Rate:</span>
                      <Badge variant="outline" className="font-mono">
                        {((userDetails.winRate || 0) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center gap-5">
                      <span className="text-sm font-medium">Tickets:</span>
                      <Badge variant="outline" className="font-mono">
                        {userDetails.ticket || 0}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-center items-center">
                    <Button 
                      variant="outline" 
                      onClick={() => setDetailedStatsModalOpen(true)}
                    >
                      View more details
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Account Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Account Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Name:</span>
                      <span className="text-sm">
                        {userDetails.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Email:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{userDetails.email}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            copyToClipboard(userDetails.email, "Email")
                          }
                        >
                          {copiedField === "Email" ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Email Status:</span>
                      <div className="flex items-center gap-2">
                        {userDetails.emailVerified !== false ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800"
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Discord Name:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {userDetails.discordName || "N/A"}
                        </span>
                        {userDetails.discordName && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              copyToClipboard(userDetails.discordName!, "Discord Name")
                            }
                          >
                            {copiedField === "Discord Name" ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Steam ID:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {userDetails.steamId || "N/A"}
                        </span>
                        {userDetails.steamId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              copyToClipboard(userDetails.steamId!, "Steam ID")
                            }
                          >
                            {copiedField === "Steam ID" ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Trade Link:</span>
                      <div className="flex items-center gap-2">
                        {userDetails.tradeLink ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                window.open(userDetails.tradeLink, "_blank")
                              }
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                copyToClipboard(
                                  userDetails.tradeLink!,
                                  "Trade Link"
                                )
                              }
                            >
                              {copiedField === "Trade Link" ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </>
                        ) : (
                          <span className="text-sm">N/A</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Member Since:</span>
                      <span className="text-sm">
                        {formatDate(userDetails.createdAt)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wallet Addresses */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Wallet Addresses
                    {!hasWalletAddresses && userDetails?.email && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto"
                        onClick={sendCryptoSetupEmail}
                        disabled={sendingCryptoEmail}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasWalletAddresses ? (
                    <div className="space-y-3">
                      {userDetails.cryptoAddresses?.bitcoin && (
                        <div className="flex items-center justify-between px-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Image
                              src="/images/icon/btc.svg"
                              alt="Bitcoin"
                              width={20}
                              height={20}
                            />
                            <span className="font-semibold text-orange-800 dark:text-orange-200 text-sm">
                              Bitcoin:
                            </span>
                            <span
                              className="font-mono text-sm break-all cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900 px-2 py-1 rounded transition-colors"
                              title={userDetails.cryptoAddresses?.bitcoin}
                            >
                              {formatAddress(
                                userDetails.cryptoAddresses.bitcoin
                              )}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              copyToClipboard(
                                userDetails.cryptoAddresses!.bitcoin!,
                                "Bitcoin Address"
                              )
                            }
                          >
                            {copiedField === "Bitcoin Address" ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                      {userDetails.cryptoAddresses?.ethereum && (
                        <div className="flex items-center justify-between px-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Image
                              src="/images/icon/eth.svg"
                              alt="Ethereum"
                              width={20}
                              height={20}
                            />
                            <span className="font-semibold text-blue-800 dark:text-blue-200 text-sm">
                              Ethereum:
                            </span>
                            <span
                              className="font-mono text-sm break-all cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 px-2 py-1 rounded transition-colors"
                              title={userDetails.cryptoAddresses?.ethereum}
                            >
                              {formatAddress(
                                userDetails.cryptoAddresses.ethereum
                              )}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              copyToClipboard(
                                userDetails.cryptoAddresses!.ethereum!,
                                "Ethereum Address"
                              )
                            }
                          >
                            {copiedField === "Ethereum Address" ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                      {userDetails.cryptoAddresses?.litecoin && (
                        <div className="flex items-center justify-between px-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Image
                              src="/images/icon/ltc.svg"
                              alt="Litecoin"
                              width={20}
                              height={20}
                            />
                            <span className="font-semibold text-blue-800 dark:text-blue-200 text-sm">
                              Litecoin:
                            </span>
                            <span
                              className="font-mono text-sm break-all cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 px-2 py-1 rounded transition-colors"
                              title={userDetails.cryptoAddresses?.litecoin}
                            >
                              {formatAddress(
                                userDetails.cryptoAddresses.litecoin
                              )}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              copyToClipboard(
                                userDetails.cryptoAddresses!.litecoin!,
                                "Litecoin Address"
                              )
                            }
                          >
                            {copiedField === "Litecoin Address" ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No wallet addresses configured</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Rewards */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Rewards
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Daily Cases:</span>
                      <Badge variant="outline">
                        {userDetails.dailyCase
                          ? `${userDetails.dailyCase.total} - ${userDetails.dailyCase.valuable}/${userDetails.dailyCase.zeroValue}`
                          : 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Weekly Prizes:
                      </span>
                      <Badge variant="outline">
                        {userDetails.weeklyPrize || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Monthly Prizes:
                      </span>
                      <Badge variant="outline">
                        {userDetails.monthlyPrize || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-center items-center">
                      <Button 
                        variant="outline" 
                        onClick={() => setRewardDetailsModalOpen(true)}
                      >
                        View reward details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Detailed Statistics Modal */}
      <UserDetailedStatsModal
        isOpen={detailedStatsModalOpen}
        onClose={() => setDetailedStatsModalOpen(false)}
        userId={userId}
      />

      {/* Reward Details Modal */}
      <UserRewardDetailsModal
        isOpen={rewardDetailsModalOpen}
        onClose={() => setRewardDetailsModalOpen(false)}
        userId={userId}
      />
    </Dialog>
  );
};
