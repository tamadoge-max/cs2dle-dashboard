"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Users, UserCheck, UserX, Globe, X, Maximize, Minimize } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { codeToCountryName } from '@/data/country-code';
// Dynamically import MapContainer and other Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import('react-leaflet').then((mod) => mod.GeoJSON),
  { ssr: false }
);

interface UserLocation {
  userId: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  ip: string;
  userAgent: string;
  timestamp: Date;
  isGuest: boolean;
  userInfo: {
    name?: string;
    email?: string;
    image?: string;
  } | null;
}

interface CountryStats {
  country: string;
  users: number;
  guests: number;
  registered: number;
}

interface LocationData {
  locationData: UserLocation[];
  countries: CountryStats[];
  totalLocations: number;
  guestCount: number;
  registeredCount: number;
}

type UserFilter = 'all' | 'registered' | 'guests';

// Helper function to get country flag image URL
const getCountryFlagUrl = (countryCode: string): string => {
  if (!countryCode || countryCode === 'Unknown') return '';
  // Using flagcdn.com for high-quality flag images
  return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
};

export const UserLocationMap = () => {
  const [data, setData] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [geoJsonLoading, setGeoJsonLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const geoJsonLayerRef = useRef<any>(null);

  useEffect(() => {
    // Load Leaflet and configure icons
    if (typeof window !== 'undefined') {
      // Check if CSS is already loaded
      const existingLink = document.querySelector('link[href*="leaflet.css"]');
      if (!existingLink) {
        // Load CSS dynamically
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }

      import('leaflet').then((L) => {
        // Fix default marker icon issue with webpack
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });
        setLeafletLoaded(true);
      });
    }
  }, []);

  const fetchLocationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/cs2dle/analytics/location-data');
      const result = await response.json();

      if (result.locationData) {
        setData(result);
      } else {
        setError("Failed to fetch location data");
      }
    } catch (err) {
      setError("An error occurred while fetching location data");
      console.error("Location data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocationData();
  }, []);

  // Fetch GeoJSON data for country boundaries
  useEffect(() => {
    const fetchGeoJson = async () => {
      try {
        setGeoJsonLoading(true);
        // Using Natural Earth Data's simplified country boundaries
        const response = await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson');
        const geojson = await response.json();
        setGeoJsonData(geojson);
      } catch (err) {
        console.error('Error loading GeoJSON:', err);
      } finally {
        setGeoJsonLoading(false);
      }
    };
    
    if (leafletLoaded) {
      fetchGeoJson();
    }
  }, [leafletLoaded]);

  const handleCountryClick = (country: string) => {
    if (selectedCountry === country) {
      // If clicking the same country, deselect it
      setSelectedCountry(null);
    } else {
      setSelectedCountry(country);
    }
  };

  const clearCountryFilter = () => {
    setSelectedCountry(null);
  };

  const toggleFullscreen = async () => {
    if (!cardRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await cardRef.current.requestFullscreen();
        setIsFullscreen(true);
        // Force map to remount when entering fullscreen
        setMapKey(prev => prev + 1);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        // Force map to remount when exiting fullscreen
        setMapKey(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  // Monitor fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const wasFullscreen = isFullscreen;
      const nowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(nowFullscreen);
      
      // If fullscreen state changed (e.g., via ESC key), remount the map
      if (wasFullscreen !== nowFullscreen) {
        setMapKey(prev => prev + 1);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  if (loading || !leafletLoaded || geoJsonLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>User Locations</CardTitle>
          <CardDescription>Loading location data...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>User Locations</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchLocationData}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Filter location data based on user filter and selected country
  const filteredLocationData = data.locationData.filter(location => {
    // Apply user type filter
    let passesUserFilter = true;
    if (userFilter === 'registered') {
      passesUserFilter = !location.isGuest;
    } else if (userFilter === 'guests') {
      passesUserFilter = location.isGuest;
    }
    
    // Apply country filter
    let passesCountryFilter = true;
    if (selectedCountry) {
      passesCountryFilter = (location.country || 'Unknown') === selectedCountry;
    }
    
    return passesUserFilter && passesCountryFilter;
  });

  // Recalculate country stats based on filtered data
  const filteredCountryStats = new Map<string, CountryStats>();
  filteredLocationData.forEach(location => {
    const country = location.country || 'Unknown';
    if (!filteredCountryStats.has(country)) {
      filteredCountryStats.set(country, {
        country,
        users: 0,
        guests: 0,
        registered: 0
      });
    }
    const stats = filteredCountryStats.get(country)!;
    stats.users++;
    if (location.isGuest) {
      stats.guests++;
    } else {
      stats.registered++;
    }
  });

  const filteredCountries = Array.from(filteredCountryStats.values())
    .sort((a, b) => b.users - a.users);

  // Calculate filtered statistics
  const filteredStats = {
    total: filteredLocationData.length,
    registered: filteredLocationData.filter(loc => !loc.isGuest).length,
    guests: filteredLocationData.filter(loc => loc.isGuest).length,
    countries: filteredCountries.length
  };

  // Create a map for quick country lookup by name
  const countryUserCount = new Map<string, number>();
  filteredCountries.forEach(country => {
    countryUserCount.set(country.country, country.users);
  });

  // Find the max user count for color scaling
  const maxUserCount = Math.max(...Array.from(countryUserCount.values()), 1);

  // Function to get color based on user count (heatmap)
  const getColor = (userCount: number): string => {
    if (userCount === 0) return '#f0f0f0';
    
    const ratio = userCount / maxUserCount;
    
    if (ratio > 0.7) return '#800026';
    if (ratio > 0.5) return '#BD0026';
    if (ratio > 0.3) return '#E31A1C';
    if (ratio > 0.2) return '#FC4E2A';
    if (ratio > 0.1) return '#FD8D3C';
    if (ratio > 0.05) return '#FEB24C';
    if (ratio > 0.02) return '#FED976';
    return '#FFEDA0';
  };

  // Style function for GeoJSON features
  const style = (feature: any) => {
    const countryCode = feature.properties.ISO_A2 || feature.properties.ISO_A2_EH;
    const userCount = countryUserCount.get(countryCode) || 0;
    
    return {
      fillColor: getColor(userCount),
      weight: selectedCountry === countryCode ? 3 : 1,
      opacity: 1,
      color: selectedCountry === countryCode ? '#2563eb' : '#666',
      dashArray: selectedCountry === countryCode ? '' : '0',
      fillOpacity: userCount > 0 ? 0.7 : 0.2
    };
  };

  // Highlight feature on hover
  const highlightFeature = (e: any) => {
    const layer = e.target;
    const countryCode = layer.feature.properties.ISO_A2 || layer.feature.properties.ISO_A2_EH;
    const userCount = countryUserCount.get(countryCode);
    
    if (userCount && userCount > 0) {
      layer.setStyle({
        weight: 3,
        color: '#2563eb',
        dashArray: '',
        fillOpacity: 0.9
      });
      layer.bringToFront();
    }
  };

  // Reset highlight on mouse out
  const resetHighlight = (e: any) => {
    if (geoJsonLayerRef.current) {
      geoJsonLayerRef.current.resetStyle(e.target);
    }
  };

  // Handle click on country
  const onCountryClick = (e: any) => {
    const countryCode = e.target.feature.properties.ISO_A2 || e.target.feature.properties.ISO_A2_EH;
    const userCount = countryUserCount.get(countryCode);
    
    if (userCount && userCount > 0) {
      handleCountryClick(countryCode);
    }
  };

  // Event handlers for each feature
  const onEachFeature = (feature: any, layer: any) => {
    const countryCode = feature.properties.ISO_A2 || feature.properties.ISO_A2_EH;
    const countryName = feature.properties.NAME || feature.properties.ADMIN;
    const userCount = countryUserCount.get(countryCode) || 0;
    
    if (userCount > 0) {
      const countryStats = filteredCountries.find(c => c.country === countryCode);
      
      layer.bindTooltip(
        `<div style="text-align: center;">
          <strong style="font-size: 14px;">${countryName}</strong><br/>
          <span style="font-size: 12px;">Total Users: <strong>${userCount}</strong></span><br/>
          <span style="font-size: 11px;">Registered: ${countryStats?.registered || 0} | Guests: ${countryStats?.guests || 0}</span>
        </div>`,
        {
          permanent: false,
          sticky: true,
          className: 'country-tooltip'
        }
      );
    }
    
    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: onCountryClick
    });
  };

  return (
    <Card ref={cardRef} className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-background' : ''}`}>
      <CardHeader className="flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>
              <div className="flex items-end gap-2">
                <Globe size={30} className="text-primary" />
                User Locations
              </div>
            </CardTitle>
            <CardDescription className="mt-1">
              Geographic distribution of {userFilter === 'all' ? 'all users' : userFilter === 'registered' ? 'registered users' : 'guest users'}
              {selectedCountry && ` in ${codeToCountryName[selectedCountry] || selectedCountry}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={userFilter} onValueChange={(value) => value && setUserFilter(value as UserFilter)}>
              <ToggleGroupItem value="all" aria-label="Show all users">
                <Users className="h-4 w-4 mr-2" />
                All
              </ToggleGroupItem>
              <ToggleGroupItem value="registered" aria-label="Show registered users">
                <UserCheck className="h-4 w-4 mr-2" />
                Registered
              </ToggleGroupItem>
              <ToggleGroupItem value="guests" aria-label="Show guest users">
                <UserX className="h-4 w-4 mr-2" />
                Guests
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="flex items-center gap-2"
            >
              {isFullscreen ? (
                <>
                  <Minimize className="h-4 w-4" />
                  Exit
                </>
              ) : (
                <>
                  <Maximize className="h-4 w-4" />
                  Fullscreen
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
            <MapPin className="h-3 w-3 mr-1" />
            Total Users: {filteredStats.total.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
            <UserCheck className="h-3 w-3 mr-1" />
            Registered: {filteredStats.registered.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
            <UserX className="h-3 w-3 mr-1" />
            Guests: {filteredStats.guests.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
            <Globe className="h-3 w-3 mr-1" />
            Countries: {filteredStats.countries}
          </Badge>
          {selectedCountry && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearCountryFilter}
              className="h-7 px-2"
            >
              <X className="h-3 w-3 mr-1" />
              Clear Country Filter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className={`w-full rounded-lg overflow-hidden border ${isFullscreen ? 'h-[calc(100vh-280px)]' : 'h-[500px]'}`}>
              <MapContainer
                key={mapKey}
                center={[20, 0]}
                zoom={2}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={isFullscreen}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  opacity={0.5}
                />
                {geoJsonData && (
                  <GeoJSON
                    ref={geoJsonLayerRef}
                    key={`${mapKey}-${userFilter}-${selectedCountry}`}
                    data={geoJsonData}
                    style={style}
                    onEachFeature={onEachFeature}
                  />
                )}
              </MapContainer>
            </div>
            {/* Legend */}
            <div className="mt-4 p-4 bg-card border rounded-lg">
              <h4 className="text-sm font-semibold mb-2">User Density</h4>
              <div className="flex items-center gap-2 text-xs">
                <span>Low</span>
                <div className="flex gap-1">
                  <div className="w-8 h-4 rounded" style={{ backgroundColor: '#FFEDA0' }}></div>
                  <div className="w-8 h-4 rounded" style={{ backgroundColor: '#FED976' }}></div>
                  <div className="w-8 h-4 rounded" style={{ backgroundColor: '#FEB24C' }}></div>
                  <div className="w-8 h-4 rounded" style={{ backgroundColor: '#FD8D3C' }}></div>
                  <div className="w-8 h-4 rounded" style={{ backgroundColor: '#FC4E2A' }}></div>
                  <div className="w-8 h-4 rounded" style={{ backgroundColor: '#E31A1C' }}></div>
                  <div className="w-8 h-4 rounded" style={{ backgroundColor: '#BD0026' }}></div>
                  <div className="w-8 h-4 rounded" style={{ backgroundColor: '#800026' }}></div>
                </div>
                <span>High</span>
              </div>
            </div>
          </div>

          {/* Country List */}
          <div className="lg:col-span-1">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users size={18} />
                Users by Country
                {selectedCountry && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Filtered
                  </Badge>
                )}
              </h3>
              <ScrollArea className={`pr-4 ${isFullscreen ? 'h-[calc(100vh-340px)]' : 'h-[450px]'}`}>
                {filteredCountries.length > 0 ? (
                  <div className="space-y-2">
                    {filteredCountries.map((country, index) => {
                      const countryCode = country.country; // This is already a country code like "US"
                      const countryName = codeToCountryName[countryCode] || countryCode;
                      const flagUrl = getCountryFlagUrl(countryCode);
                      
                      return (
                        <div
                          key={country.country}
                          onClick={() => handleCountryClick(country.country)}
                          className={`
                            border rounded-lg p-3 cursor-pointer transition-all
                            hover:shadow-md hover:border-primary
                            ${selectedCountry === country.country 
                              ? 'bg-primary/10 border-primary shadow-md' 
                              : 'border-border hover:bg-accent'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {flagUrl ? (
                                <Image 
                                  src={flagUrl}
                                  alt={`${countryName} flag`}
                                  width={24}
                                  height={16}
                                  className="object-cover rounded flex-shrink-0 shadow-sm"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-6 h-4 flex items-center justify-center text-xs">🌍</div>
                              )}
                              <span className="font-medium text-sm truncate">
                                {countryName}
                              </span>
                            </div>
                            <Badge 
                              variant={selectedCountry === country.country ? "default" : "secondary"} 
                              className="text-xs flex-shrink-0"
                            >
                              {country.users}
                            </Badge>
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground ml-9">
                            <span className="flex items-center gap-1">
                              <UserCheck size={12} className="text-green-600" />
                              {country.registered}
                            </span>
                            <span className="flex items-center gap-1">
                              <UserX size={12} className="text-orange-600" />
                              {country.guests}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No users found for this filter
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

