export const normalizeVoiceText = (value = "") =>
  String(value)
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
  // Specific stop commands must stay above generic "stop".
  ["end_walk", ["end walk", "stop navigation", "stop walk", "stop walking"]],
  [
    "stop_voice",
    [
      "stop listening",
      "stop voice",
      "turn off voice",
      "turn off voice assistant",
      "disable voice",
      "disable voice assistant",
      "exit voice",
      "exit assistant",
      "exit",
    ],
  ],
  [
    "stop_talking",
    [
      "stop talking",
      "be quiet",
      "quiet",
      "shush",
      "that's enough",
      "that is enough",
      "stop",
      "exit",
      "hush",
    ],
  ],
  [
    "describe",
    [
      "describe",
      "describe surroundings",
      "describe my surroundings",
      "what is around me",
      "what's around me",
      "describe now",
    ],
  ],
  [
    "read",
    [
      "read",
      "read text",
      "read this",
      "read something",
      "read the text",
      "read it",
    ],
  ],
  [
    "walk",
    [
      "walk",
      "walk assist",
      "walk assistant",
      "walk assistance",
      "walking",
      "walking assist",
      "walking assistant",
      "walking assistance",
      "start walk",
      "start walking",
      "start walk assist",
      "navigation",
      "navigate",
      "navigate me",
      "start navigation",
    ],
  ],
  ["home", ["home", "go home", "back home", "main menu", "cancel"]],
  ["back", ["back", "go back", "previous", "previous screen"]],
  [
    "emergency",
    [
      "emergency",
      "emergency help",
      "call emergency",
      "call 911",
      "call emergency services",
      "sos",
      "help me",
    ],
  ],
  [
    "help",
    [
      "guide",
      "help",
      "show guide",
      "show me the guide",
      "what can you do",
      "how does this work",
      "what are my options",
      "options",
      "repeat options",
    ],
  ],
  ["scan_again", ["scan again", "describe again", "read again", "redo", "again", "take another picture", "take another photo", "scan"]],
  [
    "repeat_direction",
    ["repeat direction", "repeat directions", "what's next", "where do i go"],
  ],
  ["repeat", ["repeat", "listen again", "say that again", "repeat that"]],
  ["pause", ["pause", "pause walk assist", "pause walking"]],
  ["resume", ["resume", "continue", "carry on", "go on"]],
  ["destination", ["destination", "where am i going", "where are we going"]],
  ["mute_guidance", ["mute guidance", "mute walk guidance"]],
  ["unmute_guidance", ["unmute guidance", "unmute walk guidance"]],
  ["history", ["history", "open history"]],
  ["settings", ["settings", "open settings"]],
];

export function parseVoiceIntent(value, { expectsConfirmation = false } = {}) {
  const text = normalizeVoiceText(value);

  if (!text) return { type: "unknown", text };

  // Direct actions win over yes/no embedded in the same utterance.
  for (const [type, phrases] of DIRECT) {
    if (containsWords(text, phrases)) return { type, text };
  }

  if (expectsConfirmation) {
    if (
      exact(text, [
        "yes",
        "yeah",
        "yep",
        "sure",
        "okay",
        "ok",
        "correct",
        "that's right",
        "that is right",
        "go ahead",
        "go there",
      ])
    ) {
      return { type: "yes", text };
    }

    if (
      exact(text, [
        "no",
        "nope",
        "not that",
        "not that one",
        "not now",
        "next",
        "another",
        "another one",
      ])
    ) {
      return { type: "no", text };
    }
  }

  return { type: "unknown", text, raw: String(value).trim() };
}

export function parseBestVoiceIntent(
  candidates,
  { expectsConfirmation = false } = {},
) {
  const values = Array.isArray(candidates) ? candidates : [candidates];

  const normalizedCandidates = values
    .map((candidate) =>
      typeof candidate === "string" ? candidate : candidate?.transcript,
    )
    .filter(Boolean);

  for (const candidate of normalizedCandidates) {
    const intent = parseVoiceIntent(candidate, { expectsConfirmation });

    if (intent.type !== "unknown") {
      return {
        ...intent,
        transcript: candidate,
      };
    }
  }

  const fallback = normalizedCandidates[0] || "";
  return {
    ...parseVoiceIntent(fallback, { expectsConfirmation }),
    transcript: fallback,
  };
}
