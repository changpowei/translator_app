export function speak(text: string, lang: "en" | "zh" = "en"): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === "en" ? "en-US" : "zh-TW";
  utterance.rate = 0.9;

  const voices = window.speechSynthesis.getVoices();
  const targetLang = lang === "en" ? "en-US" : "zh";
  const voice = voices.find((v) => v.lang.startsWith(targetLang));
  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);
}

export function isSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
