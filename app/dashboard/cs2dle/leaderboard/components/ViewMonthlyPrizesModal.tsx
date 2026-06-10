"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  AlertCircle,
  Calendar,
  Star,
  DollarSign,
  Loader2,
  Trophy,
  Edit,
  Trash2,
  Save,
  X,
} from "lucide-react";
import Image from "next/image";

interface MonthlyPrize {
  _id: string;
  name: string;
  image?: string;
  price?: number;
  monthYear: string; // Format: yyyy-mm
  rarity?: {
    name: string;
    color: string;
  };
  status: "active" | "inactive";
  assigned?: boolean;
  assignedTo?: string;
  assignedAt?: string;
  assignedUser?: {
    _id: string;
    username: string;
    avatar: string;
  };
  createdBy?: string;
  lastModifiedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ViewMonthlyPrizesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChange?: () => void;
}

const rarityOptions = [
  { name: "Consumer Grade", color: "#b0c3d9" },
  { name: "Industrial Grade", color: "#5e98d9" },
  { name: "Mil-Spec Grade", color: "#4b69ff" },
  { name: "Restricted", color: "#8847ff" },
  { name: "Classified", color: "#d32ce6" },
  { name: "Covert", color: "#eb4b4b" },
];

export const ViewMonthlyPrizesModal = ({
  isOpen,
  onClose,
  onDataChange,
}: ViewMonthlyPrizesModalProps) => {
  const [prizes, setPrizes] = useState<MonthlyPrize[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    image: "",
    price: "",
    monthYear: "",
    rarity: rarityOptions[0],
  });

  useEffect(() => {
    if (isOpen) {
      fetchMonthlyPrizes();
    }
  }, [isOpen]);

  const fetchMonthlyPrizes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/cs2dle/rewards/monthly-prize");

      if (!response.ok) {
        throw new Error("Failed to fetch monthly prizes");
      }

      const result = await response.json();
      setPrizes(result.monthlyPrizes || []);
    } catch (err) {
      setError("Error loading monthly prizes");
      console.error("Error fetching monthly prizes:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return `$${price.toFixed(2)}`;
  };

  const getRarityColor = (color: string) => {
    return color || "#b0c3d9";
  };

  const parseMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split("-");
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return {
      year: year || "Unknown",
      month: month || "Unknown",
      monthName: monthNames[parseInt(month || "0") - 1] || "Unknown",
    };
  };

  const groupPrizesByMonth = (prizes: MonthlyPrize[]) => {
    const grouped = prizes.reduce((acc, prize) => {
      const key = prize.monthYear;
      if (!acc[key]) {
        const parsed = parseMonthYear(prize.monthYear);
        acc[key] = {
          year: parsed.year,
          month: parsed.month,
          monthName: parsed.monthName,
          monthYear: prize.monthYear,
          prizes: [],
        };
      }
      acc[key].prizes.push(prize);
      return acc;
    }, {} as Record<string, { year: string; month: string; monthName: string; monthYear: string; prizes: MonthlyPrize[] }>);

    // Sort by monthYear (newest first)
    return Object.values(grouped).sort((a, b) => {
      return b.monthYear.localeCompare(a.monthYear);
    });
  };

  const handleStatusToggle = async (prize: MonthlyPrize) => {
    if (updatingItems.has(prize._id)) return;

    setUpdatingItems((prev) => new Set(prev).add(prize._id));

    try {
      const newStatus = prize.status === "active" ? "inactive" : "active";

      const response = await fetch("/api/cs2dle/rewards/monthly-prize", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          _id: prize._id,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      setPrizes((prev) =>
        prev.map((p) => (p._id === prize._id ? { ...p, status: newStatus } : p))
      );

      // Notify parent component of data change
      onDataChange?.();

      toast({
        title: "Status Updated",
        description: `Monthly prize status changed to ${newStatus}`,
      });
    } catch (err) {
      console.error("Error updating status:", err);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(prize._id);
        return newSet;
      });
    }
  };

  const handleDelete = async (prize: MonthlyPrize) => {
    if (updatingItems.has(prize._id)) return;

    setUpdatingItems((prev) => new Set(prev).add(prize._id));

    try {
      const response = await fetch(
        `/api/cs2dle/rewards/monthly-prize?_id=${prize._id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete prize");
      }

      setPrizes((prev) => prev.filter((p) => p._id !== prize._id));

      // Notify parent component of data change
      onDataChange?.();

      toast({
        title: "Prize Deleted",
        description: "Monthly prize deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting prize:", err);
      toast({
        title: "Error",
        description: "Failed to delete prize",
        variant: "destructive",
      });
    } finally {
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(prize._id);
        return newSet;
      });
    }
  };

  const handleEdit = (prize: MonthlyPrize) => {
    setEditingItem(prize._id);
    setEditFormData({
      name: prize.name || "",
      image: prize.image || "",
      price: prize.price?.toString() || "",
      monthYear: prize.monthYear || "",
      rarity: prize.rarity || rarityOptions[0],
    });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditFormData({
      name: "",
      image: "",
      price: "",
      monthYear: "",
      rarity: rarityOptions[0],
    });
  };

  const handleEditInputChange = (field: string, value: string) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRarityChange = (rarityName: string) => {
    const rarity = rarityOptions.find((r) => r.name === rarityName);
    if (rarity) {
      setEditFormData((prev) => ({
        ...prev,
        rarity,
      }));
    }
  };

  const handleSaveEdit = async (prizeId: string) => {
    if (updatingItems.has(prizeId)) return;

    if (!editFormData.name || !editFormData.monthYear) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setUpdatingItems((prev) => new Set(prev).add(prizeId));

    try {
      const response = await fetch("/api/cs2dle/rewards/monthly-prize", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          _id: prizeId,
          name: editFormData.name,
          image: editFormData.image || undefined,
          price: editFormData.price ? parseFloat(editFormData.price) : 0,
          monthYear: editFormData.monthYear,
          rarity: editFormData.rarity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update prize");
      }

      setPrizes((prev) =>
        prev.map((p) =>
          p._id === prizeId
            ? {
                ...p,
                name: editFormData.name,
                image: editFormData.image || undefined,
                price: editFormData.price ? parseFloat(editFormData.price) : 0,
                monthYear: editFormData.monthYear,
                rarity: editFormData.rarity,
              }
            : p
        )
      );

      setEditingItem(null);
      setEditFormData({
        name: "",
        image: "",
        price: "",
        monthYear: "",
        rarity: rarityOptions[0],
      });

      // Notify parent component of data change
      onDataChange?.();

      toast({
        title: "Prize Updated",
        description: "Monthly prize updated successfully",
      });
    } catch (err) {
      console.error("Error updating prize:", err);
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to update prize",
        variant: "destructive",
      });
    } finally {
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(prizeId);
        return newSet;
      });
    }
  };

  const handleRemoveAssignment = async (prize: MonthlyPrize) => {
    if (updatingItems.has(prize._id) || !prize.assignedTo) return;

    setUpdatingItems((prev) => new Set(prev).add(prize._id));

    try {
      const response = await fetch("/api/cs2dle/rewards/monthly-prize/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: prize.assignedTo,
          monthYear: prize.monthYear,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove assignment");
      }

      setPrizes((prev) =>
        prev.map((p) =>
          p._id === prize._id
            ? {
                ...p,
                assigned: false,
                assignedTo: undefined,
                assignedAt: undefined,
                assignedUser: undefined,
              }
            : p
        )
      );

      // Notify parent component of data change
      onDataChange?.();

      toast({
        title: "Assignment Removed",
        description: "Prize assignment has been successfully removed",
      });
    } catch (err) {
      console.error("Error removing assignment:", err);
      toast({
        title: "Error",
        description: "Failed to remove assignment",
        variant: "destructive",
      });
    } finally {
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(prize._id);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-blue-600" />
              Monthly Prizes
            </DialogTitle>
            <DialogDescription>
              View and manage monthly prizes for the leaderboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-blue-600" />
              Monthly Prizes
            </DialogTitle>
          </DialogHeader>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-blue-600" />
            Monthly Prizes
          </DialogTitle>
          <DialogDescription>
            View and manage monthly prizes for the leaderboard.
          </DialogDescription>
        </DialogHeader>

        {prizes.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No monthly prizes
            </h3>
            <p className="text-gray-500">
              Create your first monthly prize to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupPrizesByMonth(prizes).map((monthGroup) => (
              <div key={monthGroup.monthYear} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <h3 className="text-xl font-semibold text-white/80">
                    {monthGroup.monthName} {monthGroup.year}
                  </h3>
                  <Badge variant="outline" className="text-sm">
                    {monthGroup.prizes.length} prize
                    {monthGroup.prizes.length !== 1 ? "s" : ""}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {monthGroup.prizes.map((prize) => (
                    <Card key={prize._id} className="overflow-hidden">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-semibold truncate">
                            {editingItem === prize._id ? (
                              <Input
                                value={editFormData.name || ""}
                                onChange={(e) =>
                                  handleEditInputChange("name", e.target.value)
                                }
                                placeholder="Product name"
                                className="text-lg font-semibold"
                              />
                            ) : (
                              prize.name
                            )}
                          </CardTitle>
                          <Badge
                            variant={
                              prize.status === "active"
                                ? "default"
                                : "secondary"
                            }
                            className={
                              prize.status === "active" ? "bg-green-500" : ""
                            }
                          >
                            {prize.status}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Image */}
                        {editingItem === prize._id ? (
                          <div className="space-y-2">
                            <Label htmlFor={`image-${prize._id}`}>
                              Image URL
                            </Label>
                            <Input
                              id={`image-${prize._id}`}
                              value={editFormData.image || ""}
                              onChange={(e) =>
                                handleEditInputChange("image", e.target.value)
                              }
                              placeholder="Enter image URL"
                            />
                            {editFormData.image && (
                              <div className="relative h-32 bg-gray-50 rounded-lg overflow-hidden">
                                <Image
                                  src={editFormData.image}
                                  alt={editFormData.name}
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          prize.image && (
                            <div className="relative h-32 bg-gray-50 rounded-lg overflow-hidden">
                              <Image
                                src={prize.image}
                                alt={prize.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                          )
                        )}

                        {/* Details */}
                        <div className="space-y-2">
                          {editingItem === prize._id ? (
                            <>
                              <div className="space-y-2">
                                <Label htmlFor={`rarity-${prize._id}`}>
                                  Rarity
                                </Label>
                                <Select
                                  value={editFormData.rarity.name}
                                  onValueChange={handleRarityChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select rarity" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {rarityOptions.map((rarity) => (
                                      <SelectItem
                                        key={rarity.name}
                                        value={rarity.name}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div
                                            className="w-3 h-3 rounded-full"
                                            style={{
                                              backgroundColor: rarity.color,
                                            }}
                                          />
                                          {rarity.name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`price-${prize._id}`}>
                                  Price ($)
                                </Label>
                                <Input
                                  id={`price-${prize._id}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editFormData.price || ""}
                                  onChange={(e) =>
                                    handleEditInputChange(
                                      "price",
                                      e.target.value
                                    )
                                  }
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`monthYear-${prize._id}`}>
                                  Month & Year
                                </Label>
                                <Input
                                  id={`monthYear-${prize._id}`}
                                  type="month"
                                  value={editFormData.monthYear || ""}
                                  onChange={(e) =>
                                    handleEditInputChange(
                                      "monthYear",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              {prize.rarity && (
                                <div className="flex items-center gap-2">
                                  <Star
                                    className="h-4 w-4"
                                    style={{
                                      color: getRarityColor(prize.rarity.color),
                                    }}
                                  />
                                  <span
                                    className="text-sm font-medium"
                                    style={{
                                      color: getRarityColor(prize.rarity.color),
                                    }}
                                  >
                                    {prize.rarity.name}
                                  </span>
                                </div>
                              )}

                              {prize.price !== undefined && (
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm font-medium text-green-600">
                                    {formatPrice(prize.price)}
                                  </span>
                                </div>
                              )}

                              {/* Assignment Information */}
                              {prize.assigned && prize.assignedUser && (
                                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Trophy className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                      Assigned to:
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Image
                                      src={prize.assignedUser.avatar}
                                      alt={prize.assignedUser.username}
                                      width={24}
                                      height={24}
                                      className="rounded-full"
                                    />
                                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                      {prize.assignedUser.username}
                                    </span>
                                  </div>
                                  {prize.assignedAt && (
                                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                      Assigned:{" "}
                                      {new Date(
                                        prize.assignedAt
                                      ).toLocaleDateString()}
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2 w-full justify-center mt-2">
                                    {prize.assigned && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleRemoveAssignment(prize)
                                        }
                                        disabled={
                                          updatingItems.has(prize._id) ||
                                          editingItem !== null
                                        }
                                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                      >
                                        {updatingItems.has(prize._id) ? (
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        ) : (
                                          <X className="h-3 w-3 mr-1" />
                                        )}
                                        Remove
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          {editingItem === prize._id ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSaveEdit(prize._id)}
                                disabled={updatingItems.has(prize._id)}
                                className="flex-1"
                              >
                                {updatingItems.has(prize._id) ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Save className="h-3 w-3 mr-1" />
                                )}
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEdit}
                                disabled={updatingItems.has(prize._id)}
                                className="text-gray-600 hover:text-gray-700"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(prize)}
                                disabled={
                                  updatingItems.has(prize._id) ||
                                  editingItem !== null
                                }
                                className="flex-1"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusToggle(prize)}
                                disabled={
                                  updatingItems.has(prize._id) ||
                                  editingItem !== null
                                }
                                className="flex-1"
                              >
                                {updatingItems.has(prize._id) ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : null}
                                {prize.status === "active"
                                  ? "Deactivate"
                                  : "Activate"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(prize)}
                                disabled={
                                  updatingItems.has(prize._id) ||
                                  editingItem !== null
                                }
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
