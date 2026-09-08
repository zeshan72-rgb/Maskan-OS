/**
 * Central application configuration.
 * Change branding, name, and default locale/currency here — nothing else
 * in the codebase should hardcode these values.
 */
export const APP_CONFIG = {
  name: "RentOS",
  shortName: "RentOS",
  description: "Multi-tenant rental property operating system for Qatar",
  defaultLocale: "en" as const,
  supportedLocales: ["en", "ar"] as const,
  rtlLocales: ["ar"] as const,
  defaultCurrency: "QAR",
  defaultTimezone: "Asia/Qatar",
  colors: {
    // Neutral, restrained palette — Linear/Stripe-influenced.
    primary: "#111827", // near-black, used sparingly for emphasis
    accent: "#2563EB", // blue-600, links/primary actions
    success: "#059669",
    warning: "#D97706",
    danger: "#DC2626",
    info: "#0891B2",
  },
} as const;

export type AppLocale = (typeof APP_CONFIG.supportedLocales)[number];

export function isRtl(locale: string): boolean {
  return (APP_CONFIG.rtlLocales as readonly string[]).includes(locale);
}
