import { useMemo } from 'react';

import { ThemeMode, useThemeStore } from '../state/theme-store';

const REF_COLORS = {
  black: '#000000',
  blue: '#86ABD6',
  charcoal: '#333333',
  cream: '#FFF9EF',
  darkShell: '#1A1A19',
  demoBlue: '#6673D1',
  fog: '#F4F4F4',
  green: '#6EA06E',
  grey: '#8F8F8F',
  ink: '#222220',
  ocher: '#E4C87E',
  orange: '#F1B15E',
  paleControl: '#E7E6E4',
  red: '#EF4343',
  slate: '#4A4A44',
  warmWhite: '#FCF9F0',
  white: '#FFFFFF',
} as const;

const ORIGINAL_OCHER = REF_COLORS.ocher;

type Palette = {
  black: string;
  blue: string;
  bone: string;
  fog: string;
  gold: string;
  goldSoft: string;
  green: string;
  greenHover: string;
  greenSoft: string;
  indigo: string;
  red: string;
  rose: string;
  sand: string;
  stone: string;
  white: string;
};

type ToneTriplet = {
  dark: string;
  light: string;
  neutral: string;
};

type IntervalTriplet = {
  dark: number;
  light: number;
  neutral: number;
};

type TonalColorRoles = {
  backgroundFill: ToneTriplet;
  border: ToneTriplet;
  cardFill: ToneTriplet;
  shadow: ToneTriplet;
  text: ToneTriplet;
};

type SongStatusBadgeColors = {
  demo: string;
  mastered: string;
  mixed: string;
  recorded: string;
  released: string;
  sentToStores: string;
};

type SingleColorRoles = {
  buttonFill: string;
  destroyButtonFill: string;
  destroyButtonText: string;
  dividerLineHorizontal: string;
  dividerLineVertical: string;
  ghostButton: string;
  iconFill: string;
  inputFieldFill: string;
  inputFieldTextHint: string;
  likeToggle: string;
  menuBarButtonFillActive: string;
  menuBarButtonFillInactive: string;
  menuBarIconActive: string;
  menuBarIconInactive: string;
  seekbarBackground: string;
  seekbarProgress: string;
  seekbarThumb: string;
  songStatusBadge: SongStatusBadgeColors;
  tableHeader: string;
  tableRowFill: string;
  voteToggle: string;
};

type ImageRoles = {
  logoDark: string;
  logoLight: string;
};

type BorderRoles = {
  width: {
    dark: number;
    light: number;
    neutral: number;
  };
};

type ShadowRoles = {
  opacity: {
    dark: number;
    light: number;
    neutral: number;
  };
  size: {
    dark: number;
    light: number;
    neutral: number;
  };
};

type ThemeSemantics = {
  borders: BorderRoles;
  colors: SingleColorRoles;
  images: ImageRoles;
  intervals: {
    horizontal: IntervalTriplet;
    indent: IntervalTriplet;
    vertical: IntervalTriplet;
  };
  shadows: ShadowRoles;
  tones: TonalColorRoles;
};

type ComponentColorAliases = {
  appBackground: string;
  appBackgroundAlt: string;
  borderStrong: string;
  buttonDanger: string;
  buttonLikeActive: string;
  buttonMuted: string;
  buttonPrimary: string;
  buttonSecondary: string;
  buttonVoteActive: string;
  chromeBackground: string;
  overlayScrim: string;
  progressFill: string;
  progressTrack: string;
  shadowStrong: string;
  sidebarBackground: string;
  surfaceAccent: string;
  surfaceCard: string;
  surfaceGrouped: string;
  surfacePlayer: string;
  surfaceTab: string;
  surfaceTabActive: string;
  tagBackground: string;
  textInputHint: string;
  textInverse: string;
  textPrimary: string;
  textSecondary: string;
};

type ComponentSpacingAliases = {
  blockGap: number;
  buttonPaddingHorizontal: number;
  buttonPaddingVertical: number;
  cardPadding: number;
  chipGap: number;
  contentInsetHorizontal: number;
  contentInsetVertical: number;
  fieldGap: number;
  inlineGap: number;
  menuPanelPadding: number;
  screenIndent: number;
  sectionGap: number;
  stackGap: number;
  tabBarInsetHorizontal: number;
  tabBarInsetTop: number;
};

export type AppTheme = {
  mode: ThemeMode;
  palette: Palette;
  semantic: ThemeSemantics;
  statusBarStyle: 'dark' | 'light';
  ui: ComponentColorAliases;
  uiSpacing: ComponentSpacingAliases;
};

export const paletteThemes: Record<ThemeMode, Palette> = {
  dark: {
    black: REF_COLORS.darkShell,
    blue: REF_COLORS.blue,
    bone: REF_COLORS.ink,
    fog: '#474747',
    gold: REF_COLORS.ocher,
    goldSoft: REF_COLORS.charcoal,
    green: REF_COLORS.green,
    greenHover: REF_COLORS.green,
    greenSoft: REF_COLORS.green,
    indigo: REF_COLORS.demoBlue,
    red: REF_COLORS.red,
    rose: REF_COLORS.red,
    sand: REF_COLORS.charcoal,
    stone: REF_COLORS.grey,
    white: REF_COLORS.fog,
  },
  light: {
    black: REF_COLORS.ink,
    blue: REF_COLORS.blue,
    bone: REF_COLORS.cream,
    fog: REF_COLORS.fog,
    gold: REF_COLORS.ocher,
    goldSoft: REF_COLORS.warmWhite,
    green: REF_COLORS.green,
    greenHover: REF_COLORS.green,
    greenSoft: REF_COLORS.green,
    indigo: REF_COLORS.demoBlue,
    red: REF_COLORS.red,
    rose: REF_COLORS.red,
    sand: REF_COLORS.cream,
    stone: REF_COLORS.grey,
    white: REF_COLORS.white,
  },
};

function hexToRgba(hex: string, opacity: number) {
  const sanitized = hex.replace('#', '');

  if (sanitized.length !== 6) {
    return `rgba(0, 0, 0, ${opacity})`;
  }

  const red = Number.parseInt(sanitized.slice(0, 2), 16);
  const green = Number.parseInt(sanitized.slice(2, 4), 16);
  const blue = Number.parseInt(sanitized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function createThemeSemantics(mode: ThemeMode, palette: Palette): ThemeSemantics {
  if (mode === 'dark') {
    return {
      borders: {
        width: {
          dark: 4,
          light: 2,
          neutral: 3,
        },
      },
      colors: {
        buttonFill: palette.gold,
        destroyButtonFill: palette.red,
        destroyButtonText: palette.white,
        dividerLineHorizontal: palette.fog,
        dividerLineVertical: palette.fog,
        ghostButton: palette.blue,
        iconFill: palette.white,
        inputFieldFill: palette.black,
        inputFieldTextHint: palette.stone,
        likeToggle: palette.rose,
        menuBarButtonFillActive: palette.sand,
        menuBarButtonFillInactive: palette.black,
        menuBarIconActive: palette.green,
        menuBarIconInactive: palette.green,
        seekbarBackground: palette.sand,
        seekbarProgress: ORIGINAL_OCHER,
        seekbarThumb: palette.white,
        songStatusBadge: {
          demo: palette.gold,
          mastered: palette.blue,
          mixed: palette.indigo,
          recorded: palette.greenSoft,
          released: palette.rose,
          sentToStores: palette.green,
        },
        tableHeader: palette.sand,
        tableRowFill: palette.bone,
        voteToggle: palette.green,
      },
      images: {
        logoDark: 'assets/BandFan/BandFan - Logo Dark.svg',
        logoLight: 'assets/BandFan/BandFan - Logo Light.svg',
      },
      intervals: {
        horizontal: {
          dark: 24,
          light: 8,
          neutral: 14,
        },
        indent: {
          dark: 30,
          light: 12,
          neutral: 22,
        },
        vertical: {
          dark: 22,
          light: 8,
          neutral: 14,
        },
      },
      shadows: {
        opacity: {
          dark: 1,
          light: 0.2,
          neutral: 0.5,
        },
        size: {
          dark: 8,
          light: 2,
          neutral: 6,
        },
      },
      tones: {
        backgroundFill: {
          dark: palette.black,
          light: palette.sand,
          neutral: palette.bone,
        },
        border: {
          dark: palette.fog,
          light: palette.fog,
          neutral: palette.fog,
        },
        cardFill: {
          dark: palette.sand,
          light: palette.sand,
          neutral: palette.bone,
        },
        shadow: {
          dark: '#000000',
          light: palette.fog,
          neutral: palette.black,
        },
        text: {
          dark: palette.white,
          light: palette.stone,
          neutral: palette.white,
        },
      },
    };
  }

  return {
    borders: {
      width: {
        dark: 4,
        light: 2,
        neutral: 2,
      },
    },
    colors: {
      buttonFill: palette.gold,
      destroyButtonFill: palette.red,
      destroyButtonText: palette.white,
      dividerLineHorizontal: palette.fog,
      dividerLineVertical: palette.fog,
      ghostButton: palette.stone,
      iconFill: palette.black,
      inputFieldFill: palette.bone,
      inputFieldTextHint: palette.stone,
      likeToggle: palette.rose,
      menuBarButtonFillActive: palette.gold,
      menuBarButtonFillInactive: palette.bone,
      menuBarIconActive: palette.black,
      menuBarIconInactive: palette.stone,
      seekbarBackground: palette.fog,
      seekbarProgress: ORIGINAL_OCHER,
      seekbarThumb: palette.white,
      songStatusBadge: {
        demo: palette.gold,
        mastered: palette.blue,
        mixed: palette.indigo,
        recorded: palette.greenSoft,
        released: palette.rose,
        sentToStores: palette.green,
      },
      tableHeader: palette.sand,
      tableRowFill: palette.white,
      voteToggle: palette.green,
    },
    images: {
      logoDark: 'assets/BandFan/BandFan - Logo Dark.svg',
      logoLight: 'assets/BandFan/BandFan - Logo Light.svg',
    },
    intervals: {
      horizontal: {
        dark: 24,
        light: 8,
        neutral: 14,
      },
      indent: {
        dark: 30,
        light: 12,
        neutral: 22,
      },
      vertical: {
        dark: 22,
        light: 8,
        neutral: 14,
      },
    },
    shadows: {
      opacity: {
        dark: 1,
        light: 0.2,
        neutral: 0.4,
      },
      size: {
        dark: 8,
        light: 2,
        neutral: 6,
      },
    },
    tones: {
      backgroundFill: {
        dark: palette.goldSoft,
        light: palette.white,
        neutral: palette.bone,
      },
      border: {
        dark: palette.black,
        light: palette.fog,
        neutral: palette.black,
      },
      cardFill: {
        dark: palette.goldSoft,
        light: palette.white,
        neutral: palette.sand,
      },
      shadow: {
        dark: palette.black,
        light: palette.fog,
        neutral: palette.black,
      },
      text: {
        dark: palette.black,
        light: palette.stone,
        neutral: palette.black,
      },
    },
  };
}

function createComponentAliases(semantic: ThemeSemantics): ComponentColorAliases {
  return {
    appBackground: semantic.tones.backgroundFill.neutral,
    appBackgroundAlt: semantic.tones.backgroundFill.light,
    borderStrong: semantic.tones.border.neutral,
    buttonDanger: semantic.colors.destroyButtonFill,
    buttonLikeActive: semantic.colors.likeToggle,
    buttonMuted: semantic.tones.cardFill.dark,
    buttonPrimary: semantic.colors.buttonFill,
    buttonSecondary: semantic.colors.inputFieldFill,
    buttonVoteActive: semantic.colors.voteToggle,
    chromeBackground: semantic.tones.backgroundFill.neutral,
    overlayScrim: hexToRgba(semantic.tones.shadow.dark, semantic.shadows.opacity.neutral),
    progressFill: semantic.colors.seekbarProgress,
    progressTrack: semantic.colors.seekbarBackground,
    shadowStrong: semantic.tones.shadow.dark,
    sidebarBackground: semantic.tones.cardFill.light,
    surfaceAccent: semantic.tones.cardFill.dark,
    surfaceCard: semantic.tones.cardFill.light,
    surfaceGrouped: semantic.tones.cardFill.neutral,
    surfacePlayer: '#A2BAA2',
    surfaceTab: semantic.colors.menuBarButtonFillInactive,
    surfaceTabActive: semantic.colors.menuBarButtonFillActive,
    tagBackground: semantic.colors.tableHeader,
    textInputHint: semantic.colors.inputFieldTextHint,
    textInverse: semantic.tones.backgroundFill.light,
    textPrimary: semantic.tones.text.dark,
    textSecondary: semantic.tones.text.light,
  };
}

function createSpacingAliases(semantic: ThemeSemantics): ComponentSpacingAliases {
  return {
    blockGap: semantic.intervals.vertical.dark,
    buttonPaddingHorizontal: semantic.intervals.horizontal.neutral,
    buttonPaddingVertical: semantic.intervals.vertical.neutral,
    cardPadding: semantic.intervals.vertical.neutral,
    chipGap: semantic.intervals.horizontal.light,
    contentInsetHorizontal: semantic.intervals.indent.neutral,
    contentInsetVertical: semantic.intervals.vertical.dark,
    fieldGap: semantic.intervals.vertical.neutral,
    inlineGap: semantic.intervals.horizontal.neutral,
    menuPanelPadding: semantic.intervals.indent.neutral,
    screenIndent: semantic.intervals.indent.neutral,
    sectionGap: semantic.intervals.vertical.neutral,
    stackGap: semantic.intervals.vertical.dark,
    tabBarInsetHorizontal: semantic.intervals.indent.neutral,
    tabBarInsetTop: semantic.intervals.vertical.neutral,
  };
}

const darkSemantic = createThemeSemantics('dark', paletteThemes.dark);
const lightSemantic = createThemeSemantics('light', paletteThemes.light);

const appThemes: Record<ThemeMode, AppTheme> = {
  dark: {
    mode: 'dark',
    palette: paletteThemes.dark,
    semantic: darkSemantic,
    statusBarStyle: 'light',
    ui: createComponentAliases(darkSemantic),
    uiSpacing: createSpacingAliases(darkSemantic),
  },
  light: {
    mode: 'light',
    palette: paletteThemes.light,
    semantic: lightSemantic,
    statusBarStyle: 'dark',
    ui: createComponentAliases(lightSemantic),
    uiSpacing: createSpacingAliases(lightSemantic),
  },
};

export function getAppTheme(mode: ThemeMode) {
  return appThemes[mode];
}

export function getArtworkPalette(mode: ThemeMode) {
  const theme = getAppTheme(mode);

  return [theme.palette.gold, theme.palette.rose, theme.palette.green, theme.palette.blue, theme.palette.greenSoft];
}

export function useAppTheme() {
  const mode = useThemeStore((state) => state.mode);

  return useMemo(() => getAppTheme(mode), [mode]);
}