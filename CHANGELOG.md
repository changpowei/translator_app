# Changelog

All notable changes to this project will be documented in this file.

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
