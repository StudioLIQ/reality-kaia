export type TemplateSpec = {
  id: number;
  label: string;
  summary: string;
  details: string[];  // bullet points shown in the info panel
  sample: string;     // example question text
  answerType: "binary" | "multi" | "integer" | "datetime" | "text";
  badges?: string[];
};

export const TEMPLATES: TemplateSpec[] = [
  {
    id: 1,
    label: "Binary (Yes/No)",
    summary: "Questions whose final answer is YES or NO.",
    details: [
      "State a clear resolution criterion.",
      "Prefer exact UTC timestamps over vague dates.",
      "Avoid subjective or ambiguous terms.",
      "Consider edge cases explicitly in the question."
    ],
    sample: [
      "BTC: Did BTC-USD trade at or above $70,000 on Coinbase between 2025-03-01 00:00:00 UTC and 2025-03-31 23:59:59 UTC?",
      "Sports: Did Spain win the UEFA Euro 2024 Final in regular time against England on 2024-07-14?",
    ].join("\n\n"),
    answerType: "binary",
    badges: ["Simple", "Popular"],
  },
  {
    id: 3,
    label: "Multiple Choice",
    summary: "One final answer among predefined choices.",
    details: [
      "List choices in the question body (A/B/C...).",
      "Avoid overlapping or ambiguous choices.",
      "Include 'None of the above' if appropriate.",
      "Maximum 10 choices recommended."
    ],
    sample: [
      "BTC: What was BTC-USD’s 24h performance on Coinbase on 2025-03-15 (close-to-close, nearest 0.1%)?\\nChoices: A) Up 5%+, B) Up 0–5%, C) Flat (±0.5%), D) Down 0–5%, E) Down 5%+",
      "Sports: Who won the 2024 NBA Finals?\\nChoices: A) Boston Celtics, B) Dallas Mavericks",
    ].join("\n\n"),
    answerType: "multi",
    badges: ["Poll"],
  },
  {
    id: 4,
    label: "Numeric (Integer)",
    summary: "Final answer is an integer (whole number).",
    details: [
      "Always include the unit (e.g., USD, tx, people).",
      "Define rounding rules and plausible range.",
      "Specify data source if applicable.",
      "Consider using 0 for 'unknown' or 'N/A'."
    ],
    sample: [
      "BTC: What was the BTC-USD price on Coinbase at 2025-03-15 12:00:00 UTC? (answer = integer USD, rounded to nearest dollar)",
      "Sports: How many total goals were scored in the 2024 UEFA Champions League Final (Real Madrid vs Borussia Dortmund on 2024-06-01)? (answer = integer, unit=goals)",
    ].join("\n\n"),
    answerType: "integer",
    badges: ["Stats"],
  },
  {
    id: 5,
    label: "Date/Time (Unix seconds)",
    summary: "Final answer is a Unix timestamp (UTC).",
    details: [
      "All times are in UTC.",
      "Provide the event occurrence time in seconds.",
      "Use 0 for 'never happened'.",
      "Specify precision requirements."
    ],
    sample: [
      "BTC: When did BTC-USD first trade above $70,000 on Coinbase after 2025-03-01 00:00:00 UTC? (answer = unix seconds, UTC)",
      "Sports: What was the official kickoff time (UTC) of Super Bowl LVIII (2024-02-11)? (answer = unix seconds, UTC)",
    ].join("\n\n"),
    answerType: "datetime",
    badges: ["UTC"],
  },
  {
    id: 7,
    label: "Text (hash match)",
    summary: "Free text verified by hash matching.",
    details: [
      "Useful to avoid putting sensitive text on-chain.",
      "Specify hashing/normalization rules in the question.",
      "Define case sensitivity and whitespace handling.",
      "Consider using keccak256 for consistency."
    ],
    sample: [
      "BTC: What is the Coinbase ticker symbol used for bitcoin quoted in USD? (answer = uppercase ticker; verify via keccak256(lowercase(trimmed)))",
      "Sports: Who was awarded Super Bowl LVIII MVP? (answer = full name per NFL.com; verify via keccak256(lowercase(trimmed)))",
    ].join("\n\n"),
    answerType: "text",
    badges: ["Privacy"],
  },
];

export const getAllowedTemplates = (_chainId: number) => TEMPLATES;
