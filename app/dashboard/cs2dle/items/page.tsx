"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Filter,
  Loader2,
  RefreshCw,
  AlertCircle,
  Box,
} from "lucide-react";
import Image from "next/image";
import { PriceUpdateButton } from "@/components/PriceUpdateButton";

interface Item {
  _id: string;
  id: string;
  name: string;
  description: string;
  image: string;
  weapon: {
    id: string;
    weapon_id: number;
    name: string;
  };
  category: {
    id: string;
    name: string;
  };
  pattern: {
    id: string;
    name: string;
  };
  rarity: {
    id: string;
    name: string;
    color: string;
  };
  team: {
    id: string;
    name: string;
  };
  stattrak: boolean;
  souvenir: boolean;
  min_float?: number;
  max_float?: number;
  paint_index?: string;
  year?: string;
  price?: {
    last_24h?: number;
    last_7d?: number;
    last_30d?: number;
    last_90d?: number;
    last_ever?: number;
  };
}

interface ItemsResponse {
  success: boolean;
  data: Item[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface FilterOptions {
  categories: string[];
  rarities: string[];
  weapons: string[];
}

const ItemsPage = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRarity, setSelectedRarity] = useState("all");
  const [selectedWeapon, setSelectedWeapon] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    categories: [],
    rarities: [],
    weapons: [],
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Fetch filter options
  const fetchFilterOptions = useCallback(async () => {
    try {
      const [categoriesRes, raritiesRes, weaponsRes] = await Promise.all([
        fetch("/api/cs2dle/games/skins/categories"),
        fetch("/api/cs2dle/items/rarities"),
        fetch("/api/cs2dle/items/weapons"),
      ]);

      const categories = await categoriesRes.json();
      const rarities = await raritiesRes.json();
      const weapons = await weaponsRes.json();

      setFilterOptions({
        categories: categories.categories || [],
        rarities: rarities.rarities || [],
        weapons: weapons.weapons || [],
      });
    } catch (error) {
      console.error("Error fetching filter options:", error);
    }
  }, []);

  // Fetch items
  const fetchItems = useCallback(
    async (page: number = 1, reset: boolean = false) => {
      try {
        if (reset) {
          setLoading(true);
          setItems([]);
        } else {
          setLoadingMore(true);
        }

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          ...(searchTerm && { search: searchTerm }),
          ...(selectedCategory !== "all" && { category: selectedCategory }),
          ...(selectedRarity !== "all" && { rarity: selectedRarity }),
          ...(selectedWeapon !== "all" && { weapon: selectedWeapon }),
        });

        const response = await fetch(`/api/cs2dle/items?${params}`);
        const data: ItemsResponse = await response.json();

        if (data.success) {
          if (reset) {
            setItems(data.data);
          } else {
            setItems((prev) => [...prev, ...data.data]);
          }
          setPagination(data.pagination);
          setError(null);
        } else {
          setError("Failed to fetch items");
        }
      } catch (error) {
        console.error("Error fetching items:", error);
        setError("Failed to fetch items");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setIsInitialLoad(false);
      }
    },
    [searchTerm, selectedCategory, selectedRarity, selectedWeapon]
  );

  // Load more items when scrolling to bottom
  const loadMore = useCallback(() => {
    if (!loadingMore && pagination.hasNextPage) {
      fetchItems(pagination.page + 1, false);
    }
  }, [loadingMore, pagination.hasNextPage, pagination.page, fetchItems]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          pagination.hasNextPage &&
          !loadingMore
        ) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, pagination.hasNextPage, loadingMore]);

  // Initial load and filter changes
  useEffect(() => {
    fetchFilterOptions();
    fetchItems(1, true);
  }, [fetchFilterOptions, fetchItems]);

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isInitialLoad) {
        fetchItems(1, true);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    searchTerm,
    selectedCategory,
    selectedRarity,
    selectedWeapon,
    fetchItems,
    isInitialLoad,
  ]);

  const handleRefresh = () => {
    fetchItems(1, true);
  };

  const formatPrice = (price?: number) => {
    if (!price) return "N/A";
    return `$${price.toFixed(2)}`;
  };

  const getRarityColor = (color: string) => {
    return color || "#b0c3d9";
  };

  if (loading && isInitialLoad) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Box className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              CS2 Items
            </h1>
          </div>
        </div>

        {/* Enhanced Loading Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-0 shadow-sm">
              <CardContent className="p-0">
                <Skeleton className="w-full aspect-square bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-1/4" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-8 w-full rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-white/75">
              CS2 Items
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Browse and manage Counter-Strike 2 items database
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center justify-center">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <div className="flex justify-center">
            <PriceUpdateButton />
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <Card className="border-0 rounded-none shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Advanced Filters
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Search */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Items
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, weapon, or pattern..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Category
              </label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-medium">
                    All Categories
                  </SelectItem>
                  {filterOptions.categories.map((category) => (
                    <SelectItem
                      key={category}
                      value={category}
                      className="font-medium"
                    >
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rarity Filter */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                Rarity
              </label>
              <Select value={selectedRarity} onValueChange={setSelectedRarity}>
                <SelectTrigger className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="All Rarities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-medium">
                    All Rarities
                  </SelectItem>
                  {filterOptions.rarities.map((rarity) => (
                    <SelectItem
                      key={rarity}
                      value={rarity}
                      className="font-medium"
                    >
                      {rarity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Weapon Filter */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Weapon
              </label>
              <Select value={selectedWeapon} onValueChange={setSelectedWeapon}>
                <SelectTrigger className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="All Weapons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-medium">
                    All Weapons
                  </SelectItem>
                  {filterOptions.weapons.map((weapon) => (
                    <SelectItem
                      key={weapon}
                      value={weapon}
                      className="font-medium"
                    >
                      {weapon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Results Section */}
      <div className="space-y-6">
        {/* Results Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing{" "}
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {items.length}
              </span>{" "}
              of{" "}
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {pagination.total}
              </span>{" "}
              items
            </div>
          </div>

          {/* Active Filters Display */}
          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                Search: {searchTerm}
              </Badge>
            )}
            {selectedCategory !== "all" && (
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
              >
                Category: {selectedCategory}
              </Badge>
            )}
            {selectedRarity !== "all" && (
              <Badge
                variant="secondary"
                className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
              >
                Rarity: {selectedRarity}
              </Badge>
            )}
            {selectedWeapon !== "all" && (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              >
                Weapon: {selectedWeapon}
              </Badge>
            )}
          </div>
        </div>

        {error && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                  <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                    Error Loading Items
                  </h3>
                  <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
                </div>
                <Button
                  onClick={handleRefresh}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {items.length === 0 && !loading && !error && (
          <Card className="border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-6">
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                  <Search className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No Items Found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                    No items match your current filter criteria. Try adjusting
                    your search terms or filters to find what you're looking
                    for.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCategory("all");
                      setSelectedRarity("all");
                      setSelectedWeapon("all");
                    }}
                    className="bg-white dark:bg-gray-800"
                  >
                    Clear All Filters
                  </Button>
                  <Button onClick={handleRefresh} variant="default">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
          {items.map((item) => (
            <Card
              key={item._id}
              className="group overflow-hidden rounded-none hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer border-0 shadow-sm bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800"
            >
              <CardContent className="p-0">
                {/* Image Section */}
                <div className="relative aspect-square w-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center overflow-hidden">
                  <Image
                    src={item.image || "/placeholder.svg"}
                    alt={item.name}
                    className="w-5/6 h-5/6 object-contain transition-transform duration-300 group-hover:scale-110"
                    width={200}
                    height={200}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder.svg";
                    }}
                  />

                  {/* Special Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {item.stattrak && (
                      <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-2 py-1 font-semibold shadow-md">
                        ST
                      </Badge>
                    )}
                    {item.souvenir && (
                      <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2 py-1 font-semibold shadow-md">
                        SV
                      </Badge>
                    )}
                  </div>

                  {/* Rarity Badge */}
                  <div className="absolute bottom-2 right-2">
                    <Badge
                      style={{
                        backgroundColor: getRarityColor(item.rarity.color),
                        boxShadow: `0 0 10px ${getRarityColor(
                          item.rarity.color
                        )}40`,
                      }}
                      className="text-white text-xs px-2 py-1 font-semibold shadow-lg"
                    >
                      {item.rarity.name}
                    </Badge>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-4 space-y-3">
                  {/* Item Name */}
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.name}
                  </h3>

                  {/* Weapon & Category */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        {item.weapon.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                      {item.category.name}
                    </span>
                  </div>

                  {/* Team & Year */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                      <span>{item.team.name}</span>
                    </div>
                    {item.year && (
                      <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                        {item.year}
                      </span>
                    )}
                  </div>

                  {/* Price Section */}
                  {item.price && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Price
                        </span>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {formatPrice(item.price.last_24h)}
                        </span>
                      </div>
                      {item.price.last_7d && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            7d Avg
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            {formatPrice(item.price.last_7d)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enhanced Loading more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center gap-4 p-6">
              <div className="relative">
                <div className="w-8 h-8 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400"></div>
                <div className="absolute inset-0 w-8 h-8 border-4 border-transparent rounded-full animate-ping border-t-blue-400 dark:border-t-blue-500 opacity-20"></div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Loading more items...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Intersection observer target */}
        <div ref={loadMoreRef} className="h-4" />
      </div>
    </div>
  );
};

export default ItemsPage;
