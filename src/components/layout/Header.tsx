"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-4xl items-center justify-between px-4">
        <h1 className="text-base font-bold tracking-tight">
          AI 中英學習平台
        </h1>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={signOut}
            >
              登出
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
