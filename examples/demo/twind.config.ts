import { Options } from "$fresh/plugins/twind.ts";
/*

const purple = {
  purple1: 'hsl(280, 65.0%, 99.4%)',
  purple2: 'hsl(276, 100%, 99.0%)',
  purple3: 'hsl(276, 83.1%, 97.0%)',
  purple4: 'hsl(275, 76.4%, 94.7%)',
  purple5: 'hsl(275, 70.8%, 91.8%)',
  purple6: 'hsl(274, 65.4%, 87.8%)',
  purple7: 'hsl(273, 61.0%, 81.7%)',
  purple8: 'hsl(272, 60.0%, 73.5%)',
  purple9: 'hsl(272, 51.0%, 54.0%)',
  purple10: 'hsl(272, 46.8%, 50.3%)',
  purple11: 'hsl(272, 50.0%, 45.8%)',
  purple12: 'hsl(272, 66.0%, 16.0%)',
}

*/

export default {
  selfURL: import.meta.url,
  theme: {
    extend: {
      border: "hsl(273, 61.0%, 81.7%)",
      input: "hsl(273, 61.0%, 81.7%)",
      ring: "hsl(273, 61.0%, 81.7%)",
      background: "hsl(280, 65.0%, 99.4%)",
      foreground: "hsl(272, 50.0%, 45.8%)",
      primary: {
        DEFAULT: "hsl(272, 51.0%, 54.0%)",
        foreground: "hsl(272, 50.0%, 45.8%)",
      },
      secondary: {
        DEFAULT: "hsl(272, 51.0%, 54.0%)",
        foreground: "hsl(272, 50.0%, 45.8%)",
      },
      destructive: {
        DEFAULT: "hsl(272, 51.0%, 54.0%)",
        foreground: "hsl(272, 50.0%, 45.8%)",
      },
      muted: {
        DEFAULT: "hsl(272, 51.0%, 54.0%)",
        foreground: "hsl(272, 50.0%, 45.8%)",
      },
      accent: {
        DEFAULT: "hsl(272, 51.0%, 54.0%)",
        foreground: "hsl(272, 50.0%, 45.8%)",
      },
      popover: {
        DEFAULT: "hsl(var(--popover))",
        foreground: "hsl(var(--popover-foreground))",
      },
      card: {
        DEFAULT: "hsl(var(--card))",
        foreground: "hsl(var(--card-foreground))",
      },
    },
  },
} as Options;
