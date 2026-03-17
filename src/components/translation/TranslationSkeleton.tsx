"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function TranslationSkeleton() {
  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-px bg-border" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="flex gap-1.5">
              <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="flex gap-1.5">
              <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
