"use client";

import { useState, useRef } from "react";
import { Camera, Plus, Star, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image-resize";
import { toast } from "sonner";

interface BreadEntry {
  name: string;
  rating: number;
  memo: string;
  photo_url: string | null;
  photoFile: File | null;
}

interface BreadFormProps {
  onSubmit: (breads: Omit<BreadEntry, "photoFile">[]) => void;
  loading?: boolean;
}

function StarRating({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (r: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="transition-transform active:scale-110"
        >
          <Star
            className={`h-7 w-7 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-200"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function BreadForm({ onSubmit, loading = false }: BreadFormProps) {
  const [breads, setBreads] = useState<BreadEntry[]>([
    { name: "", rating: 0, memo: "", photo_url: null, photoFile: null },
  ]);
  const [uploading, setUploading] = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const updateBread = (index: number, updates: Partial<BreadEntry>) => {
    setBreads((prev) =>
      prev.map((b, i) => (i === index ? { ...b, ...updates } : b))
    );
  };

  const addBread = () => {
    if (breads.length >= 5) return;
    setBreads((prev) => [
      ...prev,
      { name: "", rating: 0, memo: "", photo_url: null, photoFile: null },
    ]);
  };

  const removeBread = (index: number) => {
    if (breads.length <= 1) return;
    setBreads((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePhoto = async (index: number, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    updateBread(index, { photo_url: previewUrl, photoFile: file });
  };

  const uploadPhotos = async (): Promise<Omit<BreadEntry, "photoFile">[]> => {
    const supabase = createClient();
    const results: Omit<BreadEntry, "photoFile">[] = [];

    for (const bread of breads) {
      let photoUrl = bread.photo_url;

      if (bread.photoFile) {
        const resized = await resizeImage(bread.photoFile);
        const ext = resized.type === "image/webp" ? "webp" : bread.photoFile.name.split(".").pop() ?? "jpg";
        const path = `breads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage
          .from("photos")
          .upload(path, resized, {
            contentType: resized.type || "image/webp",
          });

        if (error) {
          toast.error("사진 업로드에 실패했어요", {
            description: error.message,
          });
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("photos").getPublicUrl(path);
          photoUrl = publicUrl;
        }
      }

      results.push({
        name: bread.name,
        rating: bread.rating,
        memo: bread.memo,
        photo_url: photoUrl?.startsWith("blob:") ? null : photoUrl,
      });
    }

    return results;
  };

  const handleSubmit = async () => {
    const validBreads = breads.filter((b) => b.name.trim());
    if (validBreads.length === 0) return;

    setUploading(true);
    try {
      const uploaded = await uploadPhotos();
      onSubmit(uploaded.filter((b) => b.name.trim()));
    } finally {
      setUploading(false);
    }
  };

  const isValid = breads.some((b) => b.name.trim() && b.rating > 0);

  return (
    <div className="flex flex-col gap-4">
      {breads.map((bread, index) => (
        <div
          key={index}
          className="relative rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          {breads.length > 1 && (
            <button
              onClick={() => removeBread(index)}
              className="absolute right-3 top-3 rounded-full bg-muted p-1.5 hover:bg-destructive/10 active:scale-95"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}

          {/* 사진 */}
          <div className="mb-3">
            <input
              ref={(el) => {
                fileInputRefs.current[index] = el;
              }}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhoto(index, file);
              }}
            />
            {bread.photo_url ? (
              <button
                onClick={() => fileInputRefs.current[index]?.click()}
                className="relative w-full overflow-hidden rounded-xl"
              >
                <img
                  src={bread.photo_url}
                  alt="빵 사진"
                  className="h-40 w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </button>
            ) : (
              <button
                onClick={() => fileInputRefs.current[index]?.click()}
                className="flex h-28 w-full items-center justify-center rounded-xl border-2 border-dashed border-border transition-colors hover:border-primary active:bg-muted"
              >
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                  <Camera className="h-6 w-6" />
                  <span className="text-xs font-medium">사진 찍기 📸</span>
                </div>
              </button>
            )}
          </div>

          {/* 빵 이름 */}
          <Input
            value={bread.name}
            onChange={(e) => updateBread(index, { name: e.target.value })}
            placeholder="빵 이름 (예: 소금빵, 크로와상)"
            className="mb-3 h-11 rounded-xl"
          />

          {/* 별점 */}
          <div className="mb-3 flex items-center gap-3">
            <span className="text-sm font-semibold text-muted-foreground">
              맛
            </span>
            <StarRating
              rating={bread.rating}
              onChange={(r) => updateBread(index, { rating: r })}
            />
            {bread.rating > 0 && (
              <span className="text-xs text-muted-foreground">
                {bread.rating === 5
                  ? "최고! 🤤"
                  : bread.rating === 4
                    ? "맛있어요!"
                    : bread.rating === 3
                      ? "괜찮아요"
                      : bread.rating === 2
                        ? "보통이에요"
                        : "아쉬워요"}
              </span>
            )}
          </div>

          {/* 메모 */}
          <Input
            value={bread.memo}
            onChange={(e) => updateBread(index, { memo: e.target.value })}
            placeholder="한줄 메모 (선택)"
            className="h-11 rounded-xl"
          />
        </div>
      ))}

      {/* 빵 추가 */}
      {breads.length < 5 && (
        <button
          onClick={addBread}
          className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary active:bg-muted"
        >
          <Plus className="h-4 w-4" />
          빵 더 추가하기
        </button>
      )}

      {/* 체크인 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={!isValid || loading || uploading}
        className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-white shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
      >
        {uploading || loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : null}
        {uploading
          ? "사진 올리는 중... 📤"
          : loading
            ? "저장하는 중... ✍️"
            : "체크인 완료! 🎉"}
      </button>
    </div>
  );
}
