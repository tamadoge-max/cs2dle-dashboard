"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AlertCircle, RefreshCcw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriceUpdateButton } from "@/components/PriceUpdateButton";
import { Slider } from "@/components/ui/slider";

const providerLogos: Record<string, string> = {
  privateskins: "/images/markets/privateskins.webp",
  privateSkins: "/images/markets/privateskins.webp",
  skinflow: "/images/markets/skinflow.webp",
  skinport: "/images/markets/skinport.webp",
  buff163: "/images/markets/buff163.webp",
  haloskins: "/images/markets/haloskins.webp",
  skinbaron: "/images/markets/skinbaron.webp",
  dmarket: "/images/markets/dmarket.webp",
};

const getProviderLogo = (key: string): string | null => {
  return providerLogos[key] ?? providerLogos[key.toLowerCase()] ?? null;
};

type Marketplace = {
  key: string;
  name: string;
  active: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  createdAt: string | null;
};

type MarketplacesResponse = {
  marketplaces: Marketplace[];
};

type MarketplaceUpdateResponse = {
  marketplace: Marketplace;
};

const skeletonItems = Array.from({ length: 7 });

const TOTAL_SECONDS_PER_DAY = 24 * 60 * 60;
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Amsterdam",
  hour12: false,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const amsterdamDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Amsterdam",
  dateStyle: "full",
  timeStyle: "short",
});
const localDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "full",
  timeStyle: "short",
});

const Update = () => {
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [countdown, setCountdown] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    remainingSeconds: TOTAL_SECONDS_PER_DAY,
  });
  const { toast } = useToast();

  const fetchMarketplaces = useCallback(async (showSkeleton: boolean) => {
    if (showSkeleton) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const response = await fetch("/api/cs2dle/items/marketplaces", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load marketplace settings");
      }

      const data = (await response.json()) as MarketplacesResponse;
      setMarketplaces(data.marketplaces);
    } catch (err) {
      console.error("Error loading marketplaces", err);
      setError(err instanceof Error ? err.message : "Unable to load marketplaces");
    } finally {
      if (showSkeleton) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchMarketplaces(true);
  }, [fetchMarketplaces]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const parts = timeFormatter.formatToParts(now);
      const getNumber = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((part) => part.type === type)?.value ?? "0");

      const hours = getNumber("hour");
      const minutes = getNumber("minute");
      const seconds = getNumber("second");

      const elapsedSeconds = hours * 3600 + minutes * 60 + seconds;
      const remainingSecondsRaw = TOTAL_SECONDS_PER_DAY - elapsedSeconds;
      const remainingSeconds =
        remainingSecondsRaw <= 0 ? TOTAL_SECONDS_PER_DAY : remainingSecondsRaw;

      setCountdown({
        hours: Math.floor(remainingSeconds / 3600),
        minutes: Math.floor((remainingSeconds % 3600) / 60),
        seconds: remainingSeconds % 60,
        remainingSeconds,
      });
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const countdownLabel = useMemo(() => {
    const segments: string[] = [];

    if (countdown.hours > 0) {
      segments.push(countdown.hours === 1 ? "1 hour" : `${countdown.hours} hours`);
    }

    if (countdown.minutes > 0) {
      segments.push(countdown.minutes === 1 ? "1 minute" : `${countdown.minutes} minutes`);
    }

    if (countdown.seconds > 0) {
      segments.push(countdown.seconds === 1 ? "1 second" : `${countdown.seconds} seconds`);
    }

    if (segments.length === 0) {
      return "Less than a second";
    }

    if (segments.length === 1) {
      return segments[0];
    }

    return `${segments.slice(0, -1).join(", ")} and ${segments.slice(-1)}`;
  }, [countdown.hours, countdown.minutes, countdown.seconds]);

  const nextAutomaticUpdate = useMemo(
    () => new Date(Date.now() + countdown.remainingSeconds * 1000),
    [countdown.remainingSeconds]
  );
  const nextAutomaticUpdateAmsterdam = useMemo(
    () => amsterdamDateTimeFormatter.format(nextAutomaticUpdate),
    [nextAutomaticUpdate]
  );
  const nextAutomaticUpdateLocal = useMemo(
    () => localDateTimeFormatter.format(nextAutomaticUpdate),
    [nextAutomaticUpdate]
  );

  const handleToggle = async (marketKey: string, nextActive: boolean) => {
    setUpdatingKey(marketKey);
    setError(null);

    setMarketplaces((prev) =>
      prev.map((market) =>
        market.key === marketKey ? { ...market, active: nextActive } : market
      )
    );

    try {
      const response = await fetch("/api/cs2dle/items/marketplaces", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ marketplace: marketKey, active: nextActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update marketplace state");
      }

      const data = (await response.json()) as MarketplaceUpdateResponse;

      setMarketplaces((prev) =>
        prev.map((market) =>
          market.key === data.marketplace.key ? data.marketplace : market
        )
      );

      toast({
        title: `${data.marketplace.name} ${nextActive ? "activated" : "deactivated"}`,
        description: `Marketplace has been ${nextActive ? "enabled" : "disabled"} successfully.`,
      });
    } catch (err) {
      console.error("Error updating marketplace", err);

      setMarketplaces((prev) =>
        prev.map((market) =>
          market.key === marketKey ? { ...market, active: !nextActive } : market
        )
      );

      const message = err instanceof Error ? err.message : "Unable to update marketplace";
      setError(message);

      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleBulkToggle = async (targets: Marketplace[], nextActive: boolean) => {
    if (targets.length === 0) {
      toast({
        title: nextActive ? "All active" : "All inactive",
        description: nextActive
          ? "Every marketplace is already activated."
          : "Every marketplace is already deactivated.",
      });
      return;
    }

    setBulkUpdating(true);
    setError(null);

    const previousState = marketplaces;
    const targetKeys = new Set(targets.map((market) => market.key));

    setMarketplaces((prev) =>
      prev.map((market) =>
        targetKeys.has(market.key) ? { ...market, active: nextActive } : market
      )
    );

    const failures: string[] = [];
    const updates: Record<string, Marketplace> = {};

    try {
      for (const market of targets) {
        try {
          const response = await fetch("/api/cs2dle/items/marketplaces", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ marketplace: market.key, active: nextActive }),
          });

          if (!response.ok) {
            throw new Error(
              `Failed to ${nextActive ? "activate" : "deactivate"} ${market.name}`
            );
          }

          const data = (await response.json()) as MarketplaceUpdateResponse;
          updates[market.key] = data.marketplace;
        } catch (err) {
          console.error(
            `Failed ${nextActive ? "activating" : "deactivating"} ${market.key}`,
            err
          );
          failures.push(market.key);
        }
      }

      if (failures.length > 0) {
        setMarketplaces((prev) =>
          prev.map((market) => {
            if (!targetKeys.has(market.key)) {
              return market;
            }

            if (failures.includes(market.key)) {
              const original = previousState.find((entry) => entry.key === market.key);
              return original ?? market;
            }

            return updates[market.key] ?? market;
          })
        );

        const failureNames = failures
          .map((key) => previousState.find((market) => market.key === key)?.name ?? key)
          .join(", ");

        const message = `${nextActive ? "Failed to activate" : "Failed to deactivate"}: ${failureNames}`;
        setError(message);
        toast({
          title: nextActive ? "Activation issues" : "Deactivation issues",
          description: message,
          variant: "destructive",
        });
      } else {
        setMarketplaces((prev) =>
          prev.map((market) => (updates[market.key] ? updates[market.key] : market))
        );

        toast({
          title: nextActive ? "All marketplaces activated" : "All marketplaces deactivated",
          description: nextActive
            ? "Every marketplace is now active."
            : "Every marketplace is now inactive.",
        });
      }
    } catch (err) {
      console.error(
        `Unexpected error ${nextActive ? "activating" : "deactivating"} marketplaces`,
        err
      );
      setMarketplaces(previousState);

      const message =
        err instanceof Error ? err.message : "Unable to update marketplaces";
      setError(message);
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setBulkUpdating(false);
    }
  };

  const formatMeta = (market: Marketplace) => {
    if (!market.updatedAt) {
      return market.createdAt
        ? `Created ${new Date(market.createdAt).toLocaleString()}`
        : "No changes recorded yet";
    }

    const updatedOn = new Date(market.updatedAt).toLocaleString();
    if (market.updatedBy) {
      return `Last updated ${updatedOn} by ${market.updatedBy}`;
    }
    return `Last updated ${updatedOn}`;
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col items-center gap-4 pt-6 text-center">
          <Image
            src="/images/cs2dle/logo.png"
            alt="CS2DLE Logo"
            width={160}
            height={160}
            priority
          />
        </div>

        <Tabs defaultValue="offers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="offers">Marketplace Offers</TabsTrigger>
            <TabsTrigger value="update">Update Skins</TabsTrigger>
          </TabsList>

          <TabsContent value="offers" className="mt-0">
            <Card className="max-w-7xl mx-auto">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-xl">Marketplace Availability</CardTitle>
                  <CardDescription>
                    Toggle individual marketplaces to control whether their data is active.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchMarketplaces(false)}
                    disabled={loading || refreshing || updatingKey !== null || bulkUpdating}
                  >
                    <RefreshCcw
                      className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const inactiveMarkets = marketplaces.filter((market) => !market.active);
                      void handleBulkToggle(inactiveMarkets, true);
                    }}
                    disabled={loading || refreshing || updatingKey !== null || bulkUpdating || marketplaces.length === 0}
                  >
                    Activate All
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const activeMarkets = marketplaces.filter((market) => market.active);
                      void handleBulkToggle(activeMarkets, false);
                    }}
                    disabled={loading || refreshing || updatingKey !== null || bulkUpdating || marketplaces.length === 0}
                  >
                    Deactivate All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {loading ? (
                  skeletonItems.map((_, index) => (
                    <div
                      key={`skeleton-${index}`}
                      className="flex items-center justify-between rounded-md border bg-muted/40 p-4"
                    >
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-12" />
                    </div>
                  ))
                ) : marketplaces.length === 0 ? (
                  <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No marketplaces available. Try refreshing to load data.
                  </div>
                ) : (
                  marketplaces.map((market) => {
                    const logoSrc = getProviderLogo(market.key);
                    return (
                    <div
                      key={market.key}
                      className="flex items-center justify-between rounded-md border bg-card/60 px-4 py-3"
                    >
                      <div className="flex flex-1 items-center gap-4">
                        {logoSrc ? (
                          <Image
                            src={logoSrc}
                            alt={`${market.name} logo`}
                            width={40}
                            height={40}
                            className="h-10 w-10 object-contain p-1 shadow-sm"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                            {market.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-1 flex-col">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{market.name}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                market.active
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                  : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {market.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{formatMeta(market)}</p>
                        </div>
                      </div>
                      <Switch
                        checked={market.active}
                        onCheckedChange={(checked) => handleToggle(market.key, checked)}
                        disabled={refreshing || updatingKey === market.key || bulkUpdating}
                        aria-label={`Toggle ${market.name}`}
                      />
                    </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="update" className="mt-0">
            <Card className="max-w-7xl mx-auto">
              <CardHeader>
                <CardTitle className="text-xl">Update Skin Prices</CardTitle>
                <CardDescription>
                  Trigger a full price refresh from PriceEmpire whenever you need the latest skin data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Launch the price updater to process the latest marketplace offers, match them against your inventory,
                  and store the refreshed values for CS2DLE. This operation may take several minutes depending on the
                  number of items being processed.
                </p>
                <div className="space-y-3 rounded-lg border border-dashed p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                      <span>Time remaining until automatic update (Europe/Amsterdam)</span>
                      <span>
                        {String(countdown.hours).padStart(2, "0")}:
                        {String(countdown.minutes).padStart(2, "0")}:
                        {String(countdown.seconds).padStart(2, "0")}
                      </span>
                    </div>
                    <Slider
                      value={[countdown.remainingSeconds]}
                      min={0}
                      max={TOTAL_SECONDS_PER_DAY}
                      step={1}
                      disabled
                      aria-label="Time remaining until automatic update"
                      className="cursor-default select-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Next automatic update runs in {countdownLabel}.
                    </p>
                  </div>
                </div>
                <PriceUpdateButton />
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Avoid running multiple updates at the same time. Wait for the existing update to finish before
                    starting another one.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card className="max-w-7xl mx-auto">
              <CardHeader>
                <CardTitle className="text-xl">Skin Data Update</CardTitle>
                <CardDescription>
                  Review the upcoming automated refresh and ensure downstream systems are ready for the next data drop.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Next automatic update (Amsterdam)
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {nextAutomaticUpdateAmsterdam}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Next automatic update (your local time)
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {nextAutomaticUpdateLocal}
                    </p>
                  </div>
                </div>
                <div className="space-y-3 rounded-lg border border-dashed p-4">
                  <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                    <span>Time remaining on cron schedule</span>
                    <span>
                      {String(countdown.hours).padStart(2, "0")}:
                      {String(countdown.minutes).padStart(2, "0")}:
                      {String(countdown.seconds).padStart(2, "0")}
                    </span>
                  </div>
                  <Slider
                    value={[countdown.remainingSeconds]}
                    min={0}
                    max={TOTAL_SECONDS_PER_DAY}
                    step={1}
                    disabled
                    aria-label="Time remaining until automatic update"
                    className="cursor-default select-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Scheduled refresh executes in {countdownLabel}.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  The cron job refreshes skin pricing data every night at midnight in Amsterdam. After the automatic run
                  completes, marketplace availability and analytics will reflect the latest market offers. Trigger a
                  manual update above if you need to synchronize prices ahead of schedule.
                </p>
                <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    Need the latest skin data immediately? Run a manual refresh to pull the newest marketplace changes.
                  </div>
                  <PriceUpdateButton />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Update;