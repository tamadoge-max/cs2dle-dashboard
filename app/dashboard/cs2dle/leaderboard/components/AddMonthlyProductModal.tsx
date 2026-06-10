"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, DollarSign, Image as ImageIcon, Star, Search } from "lucide-react";

interface Skin {
  _id: string;
  name: string;
  image?: string;
  weapon?: {
    id: string;
    weapon_id: string;
    name: string;
  } | string;
  category?: string;
  rarity?: {
    id: string;
    name: string;
    color: string;
  } | string;
  collections?: string[];
}

interface AddMonthlyProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const rarityOptions = [
  { name: "Consumer Grade", color: "#b0c3d9" },
  { name: "Industrial Grade", color: "#5e98d9" },
  { name: "Mil-Spec Grade", color: "#4b69ff" },
  { name: "Restricted", color: "#8847ff" },
  { name: "Classified", color: "#d32ce6" },
  { name: "Covert", color: "#eb4b4b" },
];

export const AddMonthlyProductModal = ({
  isOpen,
  onClose,
  onSuccess,
}: AddMonthlyProductModalProps) => {
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Skin[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    image: "",
    price: "",
    monthYear: "",
    rarity: rarityOptions[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.monthYear) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/cs2dle/rewards/monthly-prize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          image: formData.image || undefined,
          price: formData.price ? parseFloat(formData.price) : 0,
          monthYear: formData.monthYear,
          rarity: formData.rarity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create monthly product");
      }

      toast({
        title: "Success",
        description: "Monthly product created successfully",
      });

      onSuccess();
      setFormData({
        name: "",
        image: "",
        price: "",
        monthYear: "",
        rarity: rarityOptions[0],
      });
    } catch (error) {
      console.error("Error creating monthly product:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create monthly product",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRarityChange = (rarityName: string) => {
    const rarity = rarityOptions.find((r) => r.name === rarityName);
    if (rarity) {
      setFormData((prev) => ({
        ...prev,
        rarity,
      }));
    }
  };

  // Search for skins with debouncing
  const searchSkins = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/cs2dle/games/skins/search?q=${encodeURIComponent(query)}&limit=10`);
      if (!response.ok) {
        throw new Error('Failed to search skins');
      }
      const data = await response.json();
      setSearchResults(data.skins || []);
    } catch (error) {
      console.error('Error searching skins:', error);
      toast({
        title: "Error",
        description: "Failed to search skins",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery && searchMode) {
        searchSkins(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchMode, searchSkins]);

  // Map rarity name to color
  const getRarityColor = (rarityName: string): string => {
    const rarityColors: Record<string, string> = {
      "Consumer Grade": "#b0c3d9",
      "Industrial Grade": "#5e98d9", 
      "Mil-Spec Grade": "#4b69ff",
      "Restricted": "#8847ff",
      "Classified": "#d32ce6",
      "Covert": "#eb4b4b",
    };
    return rarityColors[rarityName] || "#b0c3d9";
  };

  // Helper function to safely get weapon name
  const getWeaponName = (weapon: Skin['weapon']): string => {
    if (!weapon) return '';
    if (typeof weapon === 'string') return weapon;
    return weapon.name || '';
  };

  // Helper function to safely get rarity name
  const getRarityName = (rarity: Skin['rarity']): string => {
    if (!rarity) return '';
    if (typeof rarity === 'string') return rarity;
    return rarity.name || '';
  };

  // Helper function to safely get rarity color
  const getRarityColorFromSkin = (rarity: Skin['rarity']): string => {
    if (!rarity) return '#b0c3d9';
    if (typeof rarity === 'string') return getRarityColor(rarity);
    return rarity.color || getRarityColor(rarity.name || '');
  };

  // Auto-populate form when skin is selected
  const selectSkin = (skin: Skin) => {
    setSelectedSkin(skin);
    const rarityName = getRarityName(skin.rarity) || "Consumer Grade";
    setFormData(prev => ({
      ...prev,
      name: skin.name,
      image: skin.image || "",
      rarity: {
        name: rarityName,
        color: getRarityColorFromSkin(skin.rarity),
      }
    }));
    setSearchQuery(skin.name);
    setSearchResults([]);
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: "",
        image: "",
        price: "",
        monthYear: "",
        rarity: rarityOptions[0],
      });
      setSearchQuery("");
      setSearchResults([]);
      setSelectedSkin(null);
      setSearchMode(true);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-blue-600" />
            Add Monthly Product
          </DialogTitle>
          <DialogDescription>
            Create a new monthly prize product for the leaderboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="search-mode">Auto-select from Database</Label>
            <Switch
              id="search-mode"
              checked={searchMode}
              onCheckedChange={setSearchMode}
            />
          </div>

          {/* Search Interface */}
          {searchMode && (
            <div className="space-y-2">
              <Label htmlFor="search">Search Skins</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a skin..."
                  className="pl-10"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-200 rounded-md p-2">
                  {searchResults.map((skin) => (
                    <Card 
                      key={skin._id} 
                      className="cursor-pointer transition-colors"
                      onClick={() => selectSkin(skin)}
                    >
                      <CardContent className="p-2">
                        <div className="flex items-center space-x-2">
                          {skin.image && (
                            <img 
                              src={skin.image} 
                              alt={skin.name}
                              className="w-8 h-8 object-contain"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{skin.name}</p>
                            <div className="flex items-center space-x-1">
                              {getWeaponName(skin.weapon) && (
                                <Badge variant="outline" className="text-xs">{getWeaponName(skin.weapon)}</Badge>
                              )}
                              {getRarityName(skin.rarity) && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs"
                                  style={{ borderColor: getRarityColorFromSkin(skin.rarity) }}
                                >
                                  {getRarityName(skin.rarity)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Selected Skin Display */}
              {selectedSkin && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    {selectedSkin.image && (
                      <img 
                        src={selectedSkin.image} 
                        alt={selectedSkin.name}
                        className="w-8 h-8 object-contain"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium text-green-800">{selectedSkin.name}</p>
                      <p className="text-xs text-green-600">Selected - You can still edit the details below</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter product name"
              required
            />
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="image">Image URL</Label>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="image"
                value={formData.image || ""}
                onChange={(e) => handleInputChange("image", e.target.value)}
                placeholder="Enter image URL"
                className="pl-10"
              />
            </div>
          </div>

          {/* Month-Year Selection */}
          <div className="space-y-2">
            <Label htmlFor="monthYear">Month & Year *</Label>
            <Input
              id="monthYear"
              type="month"
              value={formData.monthYear || ""}
              onChange={(e) => handleInputChange("monthYear", e.target.value)}
              required
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Price ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price || ""}
                onChange={(e) => handleInputChange("price", e.target.value)}
                placeholder="0.00"
                className="pl-10"
              />
            </div>
          </div>

          {/* Rarity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rarity_name">Rarity</Label>
              <Select
                value={formData.rarity.name}
                onValueChange={handleRarityChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rarity" />
                </SelectTrigger>
                <SelectContent>
                  {rarityOptions.map((rarity) => (
                    <SelectItem key={rarity.name} value={rarity.name}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: rarity.color }}
                        />
                        {rarity.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rarity_color">Rarity Color</Label>
              <Input
                id="rarity_color"
                type="color"
                value={formData.rarity.color || "#b0c3d9"}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  rarity: {
                    ...prev.rarity,
                    color: e.target.value
                  }
                }))}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Monthly Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
