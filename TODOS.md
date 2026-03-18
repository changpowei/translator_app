# TODOS

## P2 — Near-term

### Dark Mode Toggle
- **What:** Add theme toggle button in header using next-themes or manual class toggle
- **Why:** CSS dark mode variables already exist; users studying at night need it
- **Effort:** S (~20 min)
- **Depends on:** Nothing

### Daily Stats / Streak Counter
- **What:** Show "Today: N words translated, N reviewed" bar with streak flame icon
- **Why:** Gamification drives learning retention
- **Effort:** M (~30 min, needs new API endpoint + DB query by date)
- **Depends on:** Working Supabase connection

### Prompt Injection Sanitization
- **What:** Sanitize user input before passing to Gemini (strip instruction-like patterns, add XML delimiters)
- **Why:** Malicious input could leak system prompt or produce manipulated output
- **Effort:** M (~1 hr, risk of over-filtering legitimate input)
- **Depends on:** Nothing

### React Hook 測試（useFlashcards、useTranslation）
- **What:** 為 useFlashcards 和 useTranslation hook 撰寫單元測試，涵蓋 quiz 邏輯、auto-advance、rating 流程、送出、loading state、錯誤狀態
- **Why:** 目前測試覆蓋率約 25%（僅有 API route + lib 測試），需補上前端 hook 測試才能達到 40%+ 目標
- **Effort:** M (~1 hr，需安裝 @testing-library/react + 設定 JSDOM 環境)
- **Depends on:** API route 測試完成（本 PR）

## Completed

### Supabase Auth + Per-User RLS
- Migration 002: user_id column, scoped RLS policies, updated RPC
- Auth helpers, login page, AuthProvider, all routes protected
