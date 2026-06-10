"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Search, Loader2 } from "lucide-react";
import { createPreCase, type CreatePreCaseRequest } from "../setting";

interface Skin {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  image?: string;
  weapon?: {
    id: string;
    weapon_id: number;
    name: string;
  } | string;
  category?: {
    id: string;
    name: string;
  } | string;
  pattern?: {
    id: string;
    name: string;
  } | string;
  rarity?: {
    id: string;
    name: string;
    color: string;
  } | string;
  min_float?: number;
  max_float?: number;
  stattrak?: boolean;
  souvenir?: boolean;
  paint_index?: string;
  wears?: Array<{
    id: string;
    name: string;
  }>;
  collections?: string[];
  crates?: Array<{
    id: string;
    name: string;
    image: string;
  }>;
  team?: {
    id: string;
    name: string;
  } | string;
  legacy_model?: boolean;
  price?: {
    [wear: string]: (number | null)[];
  };
  updatedAt?: string | Date;
  year?: number | null;
}

interface AddPreCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPreCaseModal({ isOpen, onClose, onSuccess }: AddPreCaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Skin[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null);
  const [formData, setFormData] = useState<CreatePreCaseRequest>({
    name: "",
    description: "",
    image: "",
    weapon: {
      name: "",
    },
    category: {
      name: "",
    },
    pattern: {
      name: "",
    },
    min_float: null,
    max_float: null,
    rarity: {
      name: "Consumer Grade",
      color: "#b0c3d9",
    },
    paint_index: "",
    probability: 0,
    price: 0,
    status: "active",
    stattrak: false,
    souvenir: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.image || !formData.weapon.name || !formData.category.name || !formData.pattern.name || !formData.rarity.name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await createPreCase(formData);

      if (result.success) {
        toast({
          title: "Success",
          description: "Item created successfully",
        });
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          name: "",
          description: "",
          image: "",
          weapon: { name: "" },
          category: { name: "" },
          pattern: { name: "" },
          min_float: null,
          max_float: null,
          rarity: { name: "Consumer Grade", color: "#b0c3d9" },
          paint_index: "",
          probability: 0,
          price: 0,
          status: "active",
          stattrak: false,
          souvenir: false,
        });
        setSearchQuery("");
        setSearchResults([]);
        setSelectedSkin(null);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedChange = (parentField: string, childField: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...(prev[parentField as keyof typeof prev] as any || {}),
        [childField]: value
      }
    }));
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

  // Helper function to safely get category name
  const getCategoryName = (category: Skin['category']): string => {
    if (!category) return '';
    if (typeof category === 'string') return category;
    return category.name || '';
  };

  // Helper function to safely get pattern name
  const getPatternName = (pattern: Skin['pattern']): string => {
    if (!pattern) return '';
    if (typeof pattern === 'string') return pattern;
    return pattern.name || '';
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
      weapon: {
        name: getWeaponName(skin.weapon),
        weapon_id: typeof skin.weapon === 'object' ? skin.weapon?.weapon_id : undefined,
      },
      category: {
        name: getCategoryName(skin.category),
      },
      pattern: {
        name: getPatternName(skin.pattern),
      },
      min_float: skin.min_float || null,
      max_float: skin.max_float || null,
      rarity: {
        name: rarityName,
        color: getRarityColorFromSkin(skin.rarity),
      },
      paint_index: skin.paint_index || "",
      price: typeof skin.price === 'number' ? skin.price : 0,
      stattrak: skin.stattrak || false,
      souvenir: skin.souvenir || false,
    }));
    setSearchQuery(skin.name);
    setSearchResults([]);
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: "",
        description: "",
        image: "",
        weapon: { name: "" },
        category: { name: "" },
        pattern: { name: "" },
        min_float: null,
        max_float: null,
        rarity: { name: "Consumer Grade", color: "#b0c3d9" },
        paint_index: "",
        probability: 0,
        price: 0,
        status: "active",
        stattrak: false,
        souvenir: false,
      });
      setSearchQuery("");
      setSearchResults([]);
      setSelectedSkin(null);
      setSearchMode(true);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
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
                      key={skin._id || skin.id} 
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

          {/* Basic Information */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Item name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Item description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image URL *</Label>
            <Input
              id="image"
              value={formData.image}
              onChange={(e) => handleInputChange("image", e.target.value)}
              placeholder="Image URL"
              required
            />
          </div>

          {/* Weapon Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weapon_name">Weapon Name *</Label>
              <Input
                id="weapon_name"
                value={formData.weapon.name}
                onChange={(e) => handleNestedChange("weapon", "name", e.target.value)}
                placeholder="Weapon name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weapon_id">Weapon ID</Label>
              <Input
                id="weapon_id"
                type="number"
                value={formData.weapon.weapon_id || ""}
                onChange={(e) => handleNestedChange("weapon", "weapon_id", e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Weapon ID"
              />
            </div>
          </div>

          {/* Category and Pattern */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_name">Category *</Label>
              <Input
                id="category_name"
                value={formData.category.name}
                onChange={(e) => handleNestedChange("category", "name", e.target.value)}
                placeholder="Category name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pattern_name">Pattern *</Label>
              <Input
                id="pattern_name"
                value={formData.pattern.name}
                onChange={(e) => handleNestedChange("pattern", "name", e.target.value)}
                placeholder="Pattern name"
                required
              />
            </div>
          </div>

          {/* Float Values */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_float">Min Float</Label>
              <Input
                id="min_float"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.min_float || ""}
                onChange={(e) => handleInputChange("min_float", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_float">Max Float</Label>
              <Input
                id="max_float"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.max_float || ""}
                onChange={(e) => handleInputChange("max_float", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="1.00"
              />
            </div>
          </div>

          {/* Rarity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rarity_name">Rarity *</Label>
              <Select
                value={formData.rarity.name}
                onValueChange={(value) => {
                  const colors = {
                    "Consumer Grade": "#b0c3d9",
                    "Industrial Grade": "#5e98d9",
                    "Mil-Spec Grade": "#4b69ff",
                    "Restricted": "#8847ff",
                    "Classified": "#d32ce6",
                    "Covert": "#eb4b4b",
                  };
                  handleNestedChange("rarity", "name", value);
                  handleNestedChange("rarity", "color", colors[value as keyof typeof colors] || "#b0c3d9");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rarity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Consumer Grade">Consumer Grade</SelectItem>
                  <SelectItem value="Industrial Grade">Industrial Grade</SelectItem>
                  <SelectItem value="Mil-Spec Grade">Mil-Spec Grade</SelectItem>
                  <SelectItem value="Restricted">Restricted</SelectItem>
                  <SelectItem value="Classified">Classified</SelectItem>
                  <SelectItem value="Covert">Covert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rarity_color">Rarity Color</Label>
              <Input
                id="rarity_color"
                type="color"
                value={formData.rarity.color || "#b0c3d9"}
                onChange={(e) => handleNestedChange("rarity", "color", e.target.value)}
              />
            </div>
          </div>

          {/* Paint Index */}
          <div className="space-y-2">
            <Label htmlFor="paint_index">Paint Index</Label>
            <Input
              id="paint_index"
              value={formData.paint_index || ""}
              onChange={(e) => handleInputChange("paint_index", e.target.value)}
              placeholder="Paint index"
            />
          </div>

          {/* Probability and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="probability">Probability (%)</Label>
              <Input
                id="probability"
                type="number"
                step="0.001"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => handleInputChange("probability", parseFloat(e.target.value) || 0)}
                placeholder="0.001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleInputChange("price", parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Switches */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="stattrak"
                checked={formData.stattrak}
                onCheckedChange={(checked) => handleInputChange("stattrak", checked)}
              />
              <Label htmlFor="stattrak">StatTrak</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="souvenir"
                checked={formData.souvenir}
                onCheckedChange={(checked) => handleInputChange("souvenir", checked)}
              />
              <Label htmlFor="souvenir">Souvenir</Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
