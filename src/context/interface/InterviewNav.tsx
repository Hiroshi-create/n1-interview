import { Interviews } from "@/stores/Interviews";
import { Theme } from "@/stores/Theme";

export interface InterviewNav {
  interview: Interviews;
  theme: Theme;
  organizationName: string;
  href: string;
  isActive: boolean;
}


// export interface ThemeNav {
//   theme: Theme;
//   organizationName: string;
//   href: string;
//   isActive: boolean;
// }