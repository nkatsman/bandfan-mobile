import { Pressable, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';

import LogoDark from '../../assets/BandFan/BandFan - Logo Dark.svg';
import LogoLight from '../../assets/BandFan/BandFan - Logo Light.svg';
import ContrastIcon from '../../assets/Icons/contrast-2-fill.svg';
import SunIcon from '../../assets/Icons/sun-line.svg';
import { DS } from '../design/ds';
import { useAppTheme } from '../design/theme';

type BrandLogoMarkProps = {
  height: number;
  iconColor?: string;
  interactive?: boolean;
  logoNudgeX?: number;
  logoNudgeY?: number;
  onPress?: (event: GestureResponderEvent) => void;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  width: number;
};

const LOGO_ASPECT = 272.47 / 51.68;
const ICON_SIZE_RATIO = 0.135;
const ICON_RIGHT_RATIO = 0.045;
const ICON_TOP_RATIO = 0.185;

export function BrandLogoMark({ height, iconColor, interactive = false, logoNudgeX = 0, logoNudgeY = 0, onPress, onPressIn, onPressOut, style, width }: BrandLogoMarkProps) {
  const theme = useAppTheme();
  const Logo = theme.mode === 'dark' ? LogoDark : LogoLight;
  const ThemeIcon = theme.mode === 'dark' ? SunIcon : ContrastIcon;
  const logoWidth = Math.min(width * 0.84, height * 0.46 * LOGO_ASPECT);
  const logoHeight = logoWidth / LOGO_ASPECT;
  const themeIconSize = Math.round(height * ICON_SIZE_RATIO);
  const resolvedIconColor = iconColor ?? (theme.mode === 'dark' ? '#FFFFFF' : DS.color.ink);

  const content = (
    <View style={[styles.root, { height, width }, style]}>
      <Logo height={logoHeight} style={{ marginLeft: logoNudgeX, marginTop: logoNudgeY }} width={logoWidth} />
      <View style={[styles.themeIconSlot, { height: themeIconSize * 2.25, right: width * ICON_RIGHT_RATIO, top: height * ICON_TOP_RATIO, width: themeIconSize * 2.5 }]}>
        <ThemeIcon color={resolvedIconColor} height={themeIconSize} width={themeIconSize} />
      </View>
    </View>
  );

  if (!interactive) {
    return content;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.pressable}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  themeIconSlot: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    position: 'absolute',
  },
});
