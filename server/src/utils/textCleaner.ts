/**
 * Text Cleaner for Voice Assistant & TTS
 * Cleans markdown, formatting artifacts, and robotic fillers so voice synthesis sounds human and fluid.
 */

export function cleanTextForVoice(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText;

  // 1. Remove code blocks (replace with brief spoken note)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' [Code omitted for audio] ');

  // 2. Remove inline code backticks
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // 3. Remove markdown headers (### Header -> Header.)
  cleaned = cleaned.replace(/^#{1,6}\s*(.*?)$/gm, '$1.');

  // 4. Remove markdown bold and italics (**bold** / *italic* / __bold__)
  cleaned = cleaned.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');

  // 5. Convert markdown links [Label](url) -> Label
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 6. Convert raw URLs into friendly speech
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, 'link');

  // 7. Remove markdown bullet points (- or * at start of line)
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, '');

  // 8. Remove blockquotes (> quote)
  cleaned = cleaned.replace(/^\s*>\s+/gm, '');

  // 9. Remove robotic assistant filler openings (loop to handle chained fillers like "Sure! I'd be happy to help...")
  const roboticFillers = [
    /^(sure|certainly|of course|i'd be happy to help( you)?( with that)?|absolutely|as an ai|as an artificial intelligence)[,!.]?\s*/i,
    /^(here is the summary|here are the results|let me analyze that for you)[,!.]?\s*/i,
    /^(i understand that you want me to stop)[,!.]?\s*/i
  ];

  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const regex of roboticFillers) {
      if (regex.test(cleaned)) {
        cleaned = cleaned.replace(regex, '');
        stripped = true;
      }
    }
  }

  // 10. Clean up multiple spaces, tabs, and duplicate newlines
  cleaned = cleaned.replace(/\n{2,}/g, '. ');
  cleaned = cleaned.replace(/\n/g, ' ');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');

  // 11. Normalize duplicate punctuation (e.g. "..", "?.", "!,")
  cleaned = cleaned.replace(/\.+/g, '.');
  cleaned = cleaned.replace(/([?!])\./g, '$1');

  return cleaned.trim();
}
