"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Mode = "login" | "signup";

const ERROR_ZH: Record<string, string> = {
  "Invalid login credentials": "帳號或密碼錯誤",
  "Email not confirmed": "信箱尚未驗證，請檢查信箱",
  "User already registered": "此信箱已註冊",
  "Signup requires a valid password": "請輸入有效的密碼",
  "Password should be at least 6 characters.": "密碼至少需要 6 個字元",
};

function localizeError(msg: string): string {
  return ERROR_ZH[msg] ?? msg;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    const supabase = createBrowserClient();

    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        setError(localizeError(signUpError.message));
      } else {
        setMessage("註冊成功！請檢查信箱確認帳號。");
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(localizeError(signInError.message));
      } else {
        router.push("/");
        router.refresh();
      }
    }

    setIsLoading(false);
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-lg">
            {mode === "login" ? "登入" : "註冊"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="電子信箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Input
                type="password"
                placeholder="密碼（至少 6 個字元）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {message && (
              <p className="text-sm text-green-600 dark:text-green-400">
                {message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? "處理中..."
                : mode === "login"
                  ? "登入"
                  : "註冊"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {mode === "login" ? (
                <>
                  還沒有帳號？{" "}
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() => {
                      setMode("signup");
                      setError("");
                      setMessage("");
                    }}
                  >
                    註冊
                  </button>
                </>
              ) : (
                <>
                  已有帳號？{" "}
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() => {
                      setMode("login");
                      setError("");
                      setMessage("");
                    }}
                  >
                    登入
                  </button>
                </>
              )}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
