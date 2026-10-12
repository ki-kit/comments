/* Each Add Comment action creates a new worker instance. */
self.onmessage = async (event) => {
  const text = String(event.data?.text ?? "");
  try {
    const response = await fetch("inappropriate-words.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load inappropriate-words.json");
    const data = await response.json();
    const words = Array.isArray(data.words) ? data.words : [];

    // Match whole words and common inflected/extended forms, case-insensitively.
    // Unicode letter/number boundaries also catch punctuation-separated and mixed-case forms.
    const blocked = words.find((word) => {
      const escaped = String(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}[\\p{L}\\p{N}_-]*`, "iu");
      return pattern.test(text);
    });

    self.postMessage(blocked
      ? { allowed: false, word: blocked }
      : { allowed: true });
  } catch (error) {
    self.postMessage({ allowed: false, error: true, message: error.message });
  }
};