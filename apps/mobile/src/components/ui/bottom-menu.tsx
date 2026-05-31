import { Pressable, StyleSheet, Text, View } from 'react-native';

import CompassIcon from '../../../assets/Icons/compass-3-fill.svg';
import FolderMusicIcon from '../../../assets/Icons/folder-music-fill.svg';
import HeartIcon from '../../../assets/Icons/poker-hearts-fill.svg';
import UserIcon from '../../../assets/Icons/user-fill.svg';
import { typeScale } from '../../design/tokens';

const ICON_SIZE = 30;
const BAR_HEIGHT = 72;
const TOP_BORDER_THICKNESS = 3;
const ROOT_BOTTOM_PAD = 0;
const BUTTON_BOTTOM_PAD = 18;
const BUTTON_TOP_PAD = 18;
const MENU_OCHER = '#E7BF7B';
const MENU_BLACK = '#1A1A19';
const BOTTOM_MENU_Z_INDEX = 7000;

type MenuItem = {
  key: string;
  label: string;
};

type BottomMenuProps = {
  activeKey: string;
  items: MenuItem[];
  onSelect: (key: string) => void;
};

const ICON_BY_KEY: Record<string, React.ComponentType<{ color?: string; height?: number; width?: number }>> = {
  account: UserIcon,
  index: CompassIcon,
  liked: HeartIcon,
  playlists: FolderMusicIcon,
};

/**
 * Bottom menu variant shaped like four hardware transport buttons.
 */
export function BottomMenu({ activeKey, items, onSelect }: BottomMenuProps) {
  return (
    <View style={styles.root}>
      <View style={styles.topStrip} />
      <View style={styles.row}>
        {items.map((item, index) => {
          const focused = item.key === activeKey;
          const Icon = ICON_BY_KEY[item.key];

          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={({ pressed }) => [
                styles.button,
                index < items.length - 1 && styles.buttonDivider,
                focused && styles.buttonFocused,
                pressed && !focused && styles.pressed,
              ]}
            >
              {Icon ? <Icon color={focused ? MENU_OCHER : MENU_BLACK} height={ICON_SIZE} width={ICON_SIZE} /> : null}
              <Text numberOfLines={1} style={[styles.label, focused && styles.labelFocused]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: MENU_OCHER,
    minHeight: BAR_HEIGHT,
    paddingBottom: ROOT_BOTTOM_PAD,
    paddingHorizontal: 0,
    paddingTop: 0,
    position: 'relative',
    zIndex: BOTTOM_MENU_Z_INDEX,
  },
  topStrip: {
    backgroundColor: MENU_BLACK,
    height: TOP_BORDER_THICKNESS,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 2,
  },
  row: {
    alignItems: 'stretch',
    flexDirection: 'row',
    minHeight: BAR_HEIGHT,
    paddingTop: TOP_BORDER_THICKNESS,
    width: '100%',
  },
  button: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
    gap: 6,
    justifyContent: 'space-between',
    minHeight: BAR_HEIGHT,
    paddingBottom: BUTTON_BOTTOM_PAD,
    paddingHorizontal: 2,
    paddingTop: BUTTON_TOP_PAD,
  },
  buttonDivider: {
    borderColor: MENU_BLACK,
    borderRightWidth: 2,
  },
  buttonFocused: {
    backgroundColor: MENU_BLACK,
    transform: [{ translateX: 1 }, { translateY: 2 }],
  },
  label: {
    color: MENU_BLACK,
    fontFamily: 'IBMPlexMono',
    fontSize: typeScale.small,
    fontWeight: '700',
    textAlign: 'center',
  },
  labelFocused: {
    color: MENU_OCHER,
  },
  pressed: {
    transform: [{ translateX: 1 }, { translateY: 2 }],
  },
});

