import { Theme } from "@/stores/Theme";

export interface ThemeNav {
    theme: Theme;
    organizationName: string;
    href: string;
    isActive: boolean;
  }