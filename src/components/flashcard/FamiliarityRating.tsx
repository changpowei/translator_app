"use client";

import { Button } from "@/components/ui/button";

interface FamiliarityRatingProps {
  readonly onRate: (rating: 1 | 2 | 3 | 4 | 5) => void;
  readonly visible: boolean;
}

const ratings = [
  { value: 1 as const, label: "忘了", key: "1", color: "bg-red-500 hover:bg-red-600" },
  { value: 2 as const, label: "難", key: "2", color: "bg-orange-500 hover:bg-orange-600" },
  { value: 3 as const, label: "普通", key: "3", color: "bg-yellow-500 hover:bg-yellow-600" },
  { value: 4 as const, label: "記得", key: "4", color: "bg-lime-500 hover:bg-lime-600" },
  { value: 5 as const, label: "簡單", key: "5", color: "bg-green-500 hover:bg-green-600" },
];

export function FamiliarityRating({ onRate, visible }: FamiliarityRatingProps) {
  if (!visible) return null;

  return (
    <div className="flex justify-center gap-1">
      {ratings.map((r) => (
        <Button
          key={r.value}
          variant="ghost"
          size="sm"
          className={`${r.color} h-7 min-w-0 px-2 text-[11px] text-white`}
          onClick={(e) => {
            e.stopPropagation();
            onRate(r.value);
          }}
        >
          {r.label}
          <kbd className="ml-0.5 text-[9px] opacity-70">{r.key}</kbd>
        </Button>
      ))}
    </div>
  );
}
