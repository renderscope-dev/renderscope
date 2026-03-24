import { DM_Sans, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";

export const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
  weight: ["500", "600", "700", "800"],
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});
