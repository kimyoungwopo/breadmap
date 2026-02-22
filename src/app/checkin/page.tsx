"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BakerySearch } from "@/components/checkin/BakerySearch";
import { BreadForm } from "@/components/checkin/BreadForm";
import { CheckinCard } from "@/components/checkin/CheckinCard";
import type { KakaoPlace } from "@/lib/kakao/search";
import { toast } from "sonner";

type Step = "search" | "record" | "done";

interface CheckinResult {
  bakeryName: string;
  address: string;
  breads: { name: string; rating: number; photo_url: string | null }[];
  totalCheckins: number;
}

function CheckinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("search");
  const [selectedPlace, setSelectedPlace] = useState<KakaoPlace | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);

  // URL 쿼리파라미터로 빵집 사전 선택
  useEffect(() => {
    const name = searchParams.get("name");
    const address = searchParams.get("address");
    const kakaoPlaceId = searchParams.get("kakao_place_id");
    const paramLat = searchParams.get("lat");
    const paramLng = searchParams.get("lng");

    if (name && kakaoPlaceId && paramLat && paramLng) {
      const place: KakaoPlace = {
        id: kakaoPlaceId,
        place_name: name,
        address_name: address || "",
        road_address_name: address || "",
        x: paramLng,
        y: paramLat,
        category_name: "베이커리",
        phone: "",
        place_url: "",
      };
      setSelectedPlace(place);
      setStep("record");
    }
  }, [searchParams]);

  const handleSelectBakery = (place: KakaoPlace) => {
    setSelectedPlace(place);
    setStep("record");
  };

  const handleSubmitBreads = async (
    breads: {
      name: string;
      rating: number;
      memo: string;
      photo_url: string | null;
    }[]
  ) => {
    if (!selectedPlace) return;

    setSaving(true);
    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bakery: {
            kakao_place_id: selectedPlace.id,
            name: selectedPlace.place_name,
            address:
              selectedPlace.road_address_name || selectedPlace.address_name,
            lat: Number(selectedPlace.y),
            lng: Number(selectedPlace.x),
            category: "베이커리",
          },
          breads,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "앗, 체크인에 실패했어요!");
      }

      const data = await res.json();

      setResult({
        bakeryName: selectedPlace.place_name,
        address:
          selectedPlace.road_address_name || selectedPlace.address_name,
        breads,
        totalCheckins: data.total_checkins,
      });
      setStep("done");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "앗, 체크인에 실패했어요!"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    const text = `🍞 빵지순례 #${result.totalCheckins}\n📍 ${result.bakeryName}\n${result.breads.map((b) => `  ${b.name} ${"⭐".repeat(b.rating)}`).join("\n")}`;

    if (navigator.share) {
      await navigator.share({ title: "빵지순례", text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("복사 완료! 친구에게 자랑해보세요 😎");
    }
  };

  const handleClose = () => {
    router.push("/");
  };

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (step === "record") setStep("search");
              else router.push("/");
            }}
            className="rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">
            {step === "search" && "어디 갔다왔어요? 🔍"}
            {step === "record" && selectedPlace?.place_name}
            {step === "done" && "체크인 완료! 🎉"}
          </h1>
        </div>
      </header>

      {/* Step indicator */}
      {step !== "done" && (
        <div className="flex gap-1.5 px-4 pt-3">
          {["search", "record"].map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= (step === "search" ? 0 : 1)
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      )}

      <div className="p-4 page-enter">
        {step === "search" && <BakerySearch onSelect={handleSelectBakery} />}

        {step === "record" && selectedPlace && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-secondary p-4">
              <p className="font-bold text-secondary-foreground">
                📍 {selectedPlace.place_name}
              </p>
              <p className="mt-0.5 text-xs text-secondary-foreground/70">
                {selectedPlace.road_address_name || selectedPlace.address_name}
              </p>
            </div>

            <h2 className="text-sm font-semibold text-muted-foreground">
              어떤 빵 먹었어요? 🥐
            </h2>
            <BreadForm onSubmit={handleSubmitBreads} loading={saving} />
          </div>
        )}
      </div>

      {step === "done" && result && (
        <CheckinCard
          bakeryName={result.bakeryName}
          address={result.address}
          breads={result.breads}
          totalCheckins={result.totalCheckins}
          onShare={handleShare}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

export default function CheckinPage() {
  return (
    <Suspense>
      <CheckinContent />
    </Suspense>
  );
}
