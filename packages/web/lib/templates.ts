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
    sample: "Will BTC close above $70k on 2025-12-31 00:00 UTC?\nAnswers: YES/NO",
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
    sample: "Who will win Kaia Cup 2025?\nChoices: A) Team Alpha, B) Team Beta, C) Draw",
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
    sample: "Total transactions on Kaia on 2025-10-01? (integer, unit=tx)",
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
    sample: "When will contract X be deployed? (answer = unix seconds, UTC)",
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
    sample: "What is the secret code? (keccak256(lowercase(trimmed)))",
    answerType: "text",
    badges: ["Privacy"],
  },
];

export const getAllowedTemplates = (_chainId: number) => TEMPLATES;