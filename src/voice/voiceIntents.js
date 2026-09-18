export const normalizeVoiceText = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const exact = (text, phrases) => phrases.includes(text);
const containsWords = (text, phrases) =>
  phrases.some((phrase) =>
    new RegExp(`(?:^|\\s)${phrase.replace(/\s+/g, "\\s+")}(?:$|\\s)`).test(
      text,
    ),
  );

const DIRECT = [
  ["describe", ["describe", "describe surroundings", "describe my surroundings", "what is around me", "describe now"]],
  ["read", ["read", "read text", "read this", "read something", "read the text", "read it"]],
  ["walk", ["walk assist", "walking assist", "guide me", "navigation", "start navigation"]],
  ["home", ["home", "go home", "back home", "main menu", "cancel"]],
  ["help", ["help", "options", "what can you do", "repeat options"]],
  ["repeat", ["repeat", "listen again", "say that again"]],
  ["scan_again", ["scan again", "describe again", "read again"]],
  ["pause", ["pause", "pause walk assist"]],
  ["resume", ["resume", "continue", "carry on", "go on"]],
  ["repeat_direction", ["repeat direction", "what's next", "where do i go"]],
  ["destination", ["destination", "where am i going"]],
  ["end_walk", ["end walk", "stop navigation"]],
  ["mute_guidance", ["mute guidance"]],
  ["unmute_guidance", ["unmute guidance"]],
  ["stop_talking", ["stop", "stop talking", "be quiet", "quiet", "shush"]],
  ["stop_voice", ["stop listening", "stop voice"]],
  ["history", ["history"]],
  ["settings", ["settings"]],
];

export function parseVoiceIntent(value, { expectsConfirmation = false } = {}) {
  const text = normalizeVoiceText(value);
  if (!text) return { type: "unknown", text };

  // Explicit actions win over a yes/no embedded in the same utterance.
  for (const [type, phrases] of DIRECT) {
    if (containsWords(text, phrases)) return { type, text };
  }

  if (expectsConfirmation) {
    if (
      exact(text, [
        "yes", "yeah", "yep", "sure", "okay", "ok", "correct",
        "that's right", "that is right", "go ahead", "go there",
      ])
    ) return { type: "yes", text };
    if (exact(text, ["no", "nope", "not that", "not that one", "not now", "next", "another", "another one"])) {
      return { type: "no", text };
    }
  }

  return { type: "unknown", text, raw: value.trim() };
}
