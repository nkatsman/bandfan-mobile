import { AppTheme } from './theme';

export type ActiveButtonColors = {
  activeBlue: string;
  activeGreen: string;
  activeRed: string;
};

export function getActiveButtonColors(theme: AppTheme): ActiveButtonColors {
  return {
    activeBlue: theme.palette.blue,
    activeGreen: theme.palette.green,
    activeRed: theme.palette.red,
  };
}