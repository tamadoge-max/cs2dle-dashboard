"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, RefreshCw, DollarSign, TrendingUp, TrendingDown, Eye } from "lucide-react";
import Image from "next/image";

interface SkinData {
  id: string;
  name: string;
  description: string;
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
  stattrak: boolean;
  souvenir: boolean;
  image: string;
  prices?: {
    [key: string]: {
      buy: number;
      sell: number;
    };
  };
  price?: {
    [wearCondition: string]: {
      sell: number;
      buy: number;
    };
  };
}

interface SkinDataDisplayProps {
  initialSkins?: SkinData[];
}

const SkinDataDisplay = ({ initialSkins = [] }: SkinDataDisplayProps) => {
  const [skins, setSkins] = useState<SkinData[]>(initialSkins);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [weaponFilter, setWeaponFilter] = useState("all");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [hoveredSkin, setHoveredSkin] = useState<string | null>(null);
  
  // Infinite scroll state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch skins data (initial load or reset)
  const fetchSkins = async (reset: boolean = true) => {
    if (reset) {
      setLoading(true);
      setCurrentPage(1);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const page = reset ? 1 : currentPage + 1;
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "24",
        ...(searchTerm && { search: searchTerm }),
        ...(categoryFilter !== "all" && { category: categoryFilter }),
        ...(rarityFilter !== "all" && { rarity: rarityFilter }),
        ...(weaponFilter !== "all" && { weapon: weaponFilter }),
      });

      const response = await fetch(`/api/cs2dle/items?${params}`);
      const data = await response.json();
      
      if (data.success) {
        if (reset) {
          setSkins(data.data);
        } else {
          // Ensure new data is appended to the end of the existing list
          setSkins(prev => {
            // Check for duplicates and only add new items
            const existingIds = new Set(prev.map(skin => skin.id));
            const newSkins = data.data.filter((skin: SkinData) => !existingIds.has(skin.id));
            return [...prev, ...newSkins];
          });
        }
        setCurrentPage(page);
        setTotalItems(data.pagination?.total || data.data.length);
        setHasMore(data.pagination?.hasNextPage || data.data.length === 24);
      }
    } catch (error) {
      console.error("Error fetching skins:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load more skins for infinite scroll
  const loadMoreSkins = () => {
    if (!loadingMore && hasMore) {
      fetchSkins(false);
    }
  };

  // Filter skins - maintain original order from API
  const filteredSkins = skins.filter((skin) => {
    // Price range filter
    if (priceRange.min || priceRange.max) {
      const prices = skin.price || skin.prices;
      if (!prices) return false;
      
      const priceValues = Object.values(prices).flatMap(p => [p.sell, p.buy]).filter(p => p > 0);
      if (priceValues.length === 0) return false;
      
      const minPrice = Math.min(...priceValues);
      const maxPrice = Math.max(...priceValues);
      
      if (priceRange.min && minPrice < parseFloat(priceRange.min)) return false;
      if (priceRange.max && maxPrice > parseFloat(priceRange.max)) return false;
    }
    
    return true;
  });

  // Format price for display (convert from cents to dollars)
  const formatPrice = (price: number) => {
    const priceInDollars = price / 100; // Convert cents to dollars
    if (priceInDollars >= 1000) {
      return `$${(priceInDollars / 1000).toFixed(1)}k`;
    }
    return `$${priceInDollars.toFixed(2)}`;
  };

  // Get wear condition display name and color
  const getWearConditionInfo = (wearCondition: string) => {
    const wearMap: { [key: string]: { name: string; color: string; shortName: string } } = {
      'FactoryNew': { name: 'Factory New', color: '#4ade80', shortName: 'FN' },
      'MinimalWear': { name: 'Minimal Wear', color: '#22c55e', shortName: 'MW' },
      'FieldTested': { name: 'Field-Tested', color: '#eab308', shortName: 'FT' },
      'WellWorn': { name: 'Well-Worn', color: '#f97316', shortName: 'WW' },
      'BattleScarred': { name: 'Battle-Scarred', color: '#ef4444', shortName: 'BS' }
    };
    return wearMap[wearCondition] || { name: wearCondition, color: '#6b7280', shortName: wearCondition };
  };

  // Get all wear prices for a skin
  const getWearPrices = (skin: SkinData) => {
    const prices = skin.price || skin.prices;
    if (!prices) return [];
    
    return Object.entries(prices).map(([wearCondition, priceData]) => ({
      wearCondition,
      ...getWearConditionInfo(wearCondition),
      sell: priceData.sell,
      buy: priceData.buy
    })).sort((a, b) => {
      // Sort by wear condition quality (FN > MW > FT > WW > BS)
      const order = ['FactoryNew', 'MinimalWear', 'FieldTested', 'WellWorn', 'BattleScarred'];
      return order.indexOf(a.wearCondition) - order.indexOf(b.wearCondition);
    });
  };

  // Get price trend indicator (mock function - you can implement real trend data)
  const getPriceTrend = (skin: SkinData) => {
    // Mock trend calculation - replace with real data
    const prices = skin.price || skin.prices;
    if (!prices) return null;
    
    const allPrices = Object.values(prices).flatMap(p => [p.sell, p.buy]).filter(p => p > 0);
    if (allPrices.length === 0) return null;
    
    // Mock trend: higher priced items tend to have positive trends
    const avgPrice = allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length;
    return avgPrice > 100 ? 'up' : avgPrice > 50 ? 'stable' : 'down';
  };

  // Handle card hover
  const handleCardHover = (skinId: string | null) => {
    setHoveredSkin(skinId);
  };

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loadingMore) {
          loadMoreSkins();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      }
    );

    const loadMoreTrigger = document.getElementById('load-more-trigger');
    if (loadMoreTrigger) {
      observer.observe(loadMoreTrigger);
    }

    return () => {
      if (loadMoreTrigger) {
        observer.unobserve(loadMoreTrigger);
      }
    };
  }, [hasMore, loadingMore, currentPage]);

  // Reset infinite scroll when filters change
  const resetInfiniteScroll = () => {
    setCurrentPage(1);
    setHasMore(true);
    fetchSkins(true);
  };

  // Get the best price for a skin
  const getBestPrice = (skin: SkinData) => {
    const prices = skin.price || skin.prices;
    if (!prices) return null;
    
    const allPrices = Object.values(prices).flatMap(p => [p.sell, p.buy]).filter(p => p > 0);
    if (allPrices.length === 0) return null;
    
    return {
      min: Math.min(...allPrices),
      max: Math.max(...allPrices),
    };
  };

  useEffect(() => {
    if (initialSkins.length === 0) {
      fetchSkins();
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Filters Section - Sticky */}
      <div className="sticky top-2 md:top-4 z-50 transition-all duration-300">
        <Card className="shadow-lg border-2 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search skins..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  resetInfiniteScroll();
                }}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={(value) => {
              setCategoryFilter(value);
              resetInfiniteScroll();
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Rifles">Rifles</SelectItem>
                <SelectItem value="Pistols">Pistols</SelectItem>
                <SelectItem value="SMGs">SMGs</SelectItem>
                <SelectItem value="Heavy">Heavy</SelectItem>
                <SelectItem value="Knives">Knives</SelectItem>
                <SelectItem value="Gloves">Gloves</SelectItem>
              </SelectContent>
            </Select>

            {/* Rarity Filter */}
            <Select value={rarityFilter} onValueChange={(value) => {
              setRarityFilter(value);
              resetInfiniteScroll();
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Rarity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rarities</SelectItem>
                <SelectItem value="Consumer">Consumer</SelectItem>
                <SelectItem value="Industrial">Industrial</SelectItem>
                <SelectItem value="Mil-Spec">Mil-Spec</SelectItem>
                <SelectItem value="Restricted">Restricted</SelectItem>
                <SelectItem value="Classified">Classified</SelectItem>
                <SelectItem value="Covert">Covert</SelectItem>
              </SelectContent>
            </Select>

          </div>

          {/* Price Range */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Min Price ($)</label>
              <Input
                type="number"
                placeholder="0"
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Max Price ($)</label>
              <Input
                type="number"
                placeholder="10000"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={resetInfiniteScroll} disabled={loading} className="flex-1">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {skins.length} of {totalItems} skins
          {hasMore && " (scroll for more)"}
        </p>
      </div>

      {/* Skins Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredSkins.map((skin) => {
          const bestPrice = getBestPrice(skin);
          const wearPrices = getWearPrices(skin);
          const priceTrend = getPriceTrend(skin);
          const isHovered = hoveredSkin === skin.id;
          
          return (
            <Card 
              key={skin.id} 
              className={`
                overflow-hidden transition-all duration-200
                ${isHovered ? 'shadow-md' : 'hover:shadow-md'}
                hover:shadow-sm
              `}
              style={{
                transform: isHovered ? 'scale(1.02)' : 'scale(1)'
              }}
              onMouseEnter={() => handleCardHover(skin.id)}
              onMouseLeave={() => handleCardHover(null)}
            >
              <CardHeader className="p-2 relative">
                {/* Price Trend Indicator */}
                {priceTrend && (
                  <div className="absolute top-1 right-1 z-10">
                    {priceTrend === 'up' && (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    )}
                    {priceTrend === 'down' && (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    {priceTrend === 'stable' && (
                      <div className="h-3 w-3 rounded-full bg-gray-400" />
                    )}
                  </div>
                )}
                
                <div className="aspect-square relative mb-2 group">
                  <Image
                    src={skin.image}
                    alt={skin.name}
                    fill
                    className="object-contain transition-transform duration-200 group-hover:scale-110"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder.svg";
                    }}
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                    <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                </div>
                
                <CardTitle className="text-sm line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                  {skin.name}
                </CardTitle>
                
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge 
                    variant="secondary" 
                    className="text-xs px-1 py-0 transition-all duration-200"
                    style={{ backgroundColor: skin.rarity.color + "20", color: skin.rarity.color }}
                  >
                    {skin.rarity.name}
                  </Badge>
                  {skin.stattrak && (
                    <Badge variant="outline" className="text-xs px-1 py-0">ST</Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="p-2 pt-0">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{skin.weapon.name}</span>
                  </div>
                  
                  {/* Wear Prices Section */}
                  {wearPrices.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">
                        Prices:
                      </div>
                      <div className="space-y-0.5">
                        {wearPrices.map((wear) => (
                          <div key={wear.wearCondition} className="flex items-center justify-between text-xs hover:bg-gray-50 rounded px-1 py-0.5 transition-colors">
                            <div className="flex items-center gap-1">
                              <div 
                                className="w-1.5 h-1.5 rounded-full transition-transform duration-200 hover:scale-125"
                                style={{ backgroundColor: wear.color }}
                              />
                              <span className="font-medium">{wear.shortName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {wear.sell && (
                                <span className="text-green-600 font-medium text-xs hover:text-green-700 transition-colors">
                                  {formatPrice(wear.sell)}
                                </span>
                              )}
                              {wear.buy && wear.sell && (
                                <span className="text-muted-foreground text-xs">/</span>
                              )}
                              {wear.buy && (
                                <span className="text-blue-600 font-medium text-xs hover:text-blue-700 transition-colors">
                                  {formatPrice(wear.buy)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Fallback price range if no wear prices */}
                  {wearPrices.length === 0 && bestPrice && (
                    <div className="flex items-center justify-between text-xs font-medium hover:bg-gray-50 rounded px-1 py-0.5 transition-colors">
                      <span className="text-muted-foreground">
                        Price:
                      </span>
                      <span className="text-green-600 hover:text-green-700 transition-colors">
                        {formatPrice(bestPrice.min)} - {formatPrice(bestPrice.max)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Infinite Scroll Trigger and Loading */}
      {hasMore && (
        <div id="load-more-trigger" className="flex justify-center py-8">
          {loadingMore ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading more skins...</span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Scroll down to load more skins
            </div>
          )}
        </div>
      )}

      {/* End of results indicator */}
      {!hasMore && skins.length > 0 && (
        <div className="flex justify-center py-8">
          <div className="text-sm text-muted-foreground">
            You've reached the end! No more skins to load.
          </div>
        </div>
      )}

      {filteredSkins.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No skins found matching your criteria.</p>
            <Button variant="outline" onClick={resetInfiniteScroll} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading skins...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SkinDataDisplay;
