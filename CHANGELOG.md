# Changelog

All notable changes to this project will be documented in this file.

## [0.2.1.0] - 2026-03-18

### Added
- API route 整合測試：`/api/translate` 共 19 個測試案例（認證、速率限制、輸入驗證、Gemini 備援鏈、回應正規化 6 分支、DB 儲存）
- API route 整合測試：`/api/flashcards` 共 15 個測試案例（GET 加權排序、PATCH 熟悉度更新、POST quiz-correct 自動刪除、delete、未知 action）
- CLAUDE.md 設定繁體中文回覆偏好
- TODOS.md 新增 React Hook 測試待辦項目

### Changed
- 測試總數從 55 提升至 89（+34）

## [0.2.0.0] - 2026-03-17

### Added
- Supabase Auth with email/password login and signup
- Per-user Row Level Security (RLS) for vocabulary isolation
- Translation API with Google Gemini and 8-model fallback chain
- Flashcard deck with spaced repetition and weighted sampling
- Quiz mode with 8 multiple-choice options and language-aware options
- "Forgot" button for marking unfamiliar words (increases reinforcement weight)
- Auto-familiarity updates: correct +15%, wrong -15%, forgot -30%
- Persistent quiz streak tracking with auto-remove at 3 consecutive correct
- Shuffle button for randomizing flashcard order (Fisher-Yates)
- Word/phrase filter to prevent saving sentences to vocabulary
- LLM output validation before database writes (length/type guards)
- Spelling/grammar correction with explanation
- Confusable words detection (affect/effect, etc.)
- Usage context descriptions for words and phrases
- Extracted words from Chinese sentence translations
- Past-word reinforcement in example sentences (weighted random sampling)
- TTS (Text-to-Speech) for both English and Chinese
- Copy-to-clipboard for translations
- Keyboard shortcuts: Space (flip), arrows (navigate), 1-5 (rate), Delete (remove)
- Rate limiter for translation API
- 55 unit tests across 5 test suites

## [0.1.0] - Initial

### Added
- Initial Next.js project setup with Tailwind CSS and shadcn/ui
