"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Wallet, Package } from "lucide-react";

interface WeeklyPrize {
  id: string;
  weeklyPrize?: {
    name: string;
    image?: string;
    price?: number;
  };
}

interface User {
  _id: string;
  cryptoAddresses?: {
    bitcoin?: string;
    ethereum?: string;
    litecoin?: string;
  };
  tradeLink?: string;
}

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  weeklyPrize: WeeklyPrize;
  onConfirm: (deliveryType: "crypto" | "skin", cryptoType?: string) => void;
  isLoading?: boolean;
}

const DeliveryModal = ({
  isOpen,
  onClose,
  user,
  weeklyPrize,
  onConfirm,
  isLoading = false,
}: DeliveryModalProps) => {
  const [deliveryType, setDeliveryType] = useState<"crypto" | "skin">("crypto");
  const [cryptoType, setCryptoType] = useState<string>("");

  // Check available crypto addresses
  const availableCrypto = [];
  if (user.cryptoAddresses?.bitcoin) availableCrypto.push("bitcoin");
  if (user.cryptoAddresses?.ethereum) availableCrypto.push("ethereum");
  if (user.cryptoAddresses?.litecoin) availableCrypto.push("litecoin");

  // Set default crypto type
  if (availableCrypto.length > 0 && !cryptoType) {
    setCryptoType(availableCrypto[0]);
  }

  const hasCrypto = availableCrypto.length > 0;
  const hasSteam = !!user.tradeLink;

  const handleConfirm = () => {
    if (deliveryType === "crypto") {
      if (!cryptoType) {
        return;
      }
      onConfirm("crypto", cryptoType);
    } else {
      onConfirm("skin");
    }
  };

  const getCryptoLabel = (type: string) => {
    const labels: Record<string, string> = {
      bitcoin: "Bitcoin (BTC)",
      ethereum: "Ethereum (ETH)",
      litecoin: "Litecoin (LTC)",
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Choose Delivery Method</DialogTitle>
          <DialogDescription>
            Select how you want to send the weekly prize to the user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Prize Details */}
          {weeklyPrize.weeklyPrize && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-3">
                {weeklyPrize.weeklyPrize.image && (
                  <img
                    src={weeklyPrize.weeklyPrize.image}
                    alt={weeklyPrize.weeklyPrize.name}
                    className="w-16 h-16 object-contain"
                  />
                )}
                <div>
                  <p className="font-medium">
                    {weeklyPrize.weeklyPrize.name}
                  </p>
                  {weeklyPrize.weeklyPrize.price && (
                    <p className="text-sm text-green-600 font-semibold">
                      ${weeklyPrize.weeklyPrize.price.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Delivery Type Selection */}
          <RadioGroup
            value={deliveryType}
            onValueChange={(value) => setDeliveryType(value as "crypto" | "skin")}
          >
            {/* Cryptocurrency Option */}
            <div className="flex items-start space-x-3 space-y-0">
              <RadioGroupItem
                value="crypto"
                id="crypto"
                disabled={!hasCrypto || isLoading}
              />
              <div className="flex-1">
                <Label
                  htmlFor="crypto"
                  className={`flex items-center gap-2 ${
                    !hasCrypto ? "opacity-50" : "cursor-pointer"
                  }`}
                >
                  <Wallet className="h-4 w-4" />
                  <span className="font-medium">Cryptocurrency</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Send payment to user's crypto wallet
                </p>
                {!hasCrypto && (
                  <p className="text-sm text-destructive mt-1">
                    User has no crypto addresses configured
                  </p>
                )}
              </div>
            </div>

            {/* CS2 Skin Option */}
            <div className="flex items-start space-x-3 space-y-0">
              <RadioGroupItem
                value="skin"
                id="skin"
                disabled={!hasSteam || isLoading}
              />
              <div className="flex-1">
                <Label
                  htmlFor="skin"
                  className={`flex items-center gap-2 ${
                    !hasSteam ? "opacity-50" : "cursor-pointer"
                  }`}
                >
                  <Package className="h-4 w-4" />
                  <span className="font-medium">CS2 Skin</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Send skin to user's Steam account via trade
                </p>
                {!hasSteam && (
                  <p className="text-sm text-destructive mt-1">
                    User has no Steam trade link configured
                  </p>
                )}
              </div>
            </div>
          </RadioGroup>

          {/* Crypto Type Selection */}
          {deliveryType === "crypto" && hasCrypto && (
            <div className="mt-4 pl-7">
              <Label className="text-sm font-medium mb-2 block">
                Select Cryptocurrency
              </Label>
              <RadioGroup
                value={cryptoType}
                onValueChange={setCryptoType}
                disabled={isLoading}
              >
                {availableCrypto.map((crypto) => (
                  <div
                    key={crypto}
                    className="flex items-center space-x-2 space-y-0"
                  >
                    <RadioGroupItem value={crypto} id={crypto} />
                    <Label htmlFor={crypto} className="cursor-pointer">
                      {getCryptoLabel(crypto)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              isLoading ||
              (deliveryType === "crypto" && !cryptoType) ||
              (deliveryType === "crypto" && !hasCrypto) ||
              (deliveryType === "skin" && !hasSteam)
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send & Notify"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryModal;

