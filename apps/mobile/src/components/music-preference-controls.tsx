import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import ArrowLeftRightIcon from '../../assets/Icons/arrow-left-right-line.svg';
import MusicIcon from '../../assets/Icons/music-fill.svg';
import RepeatAllIcon from '../../assets/Icons/repeat-2-fill.svg';
import RepeatOneIcon from '../../assets/Icons/repeat-one-fill.svg';
import ShuffleIcon from '../../assets/Icons/shuffle-fill.svg';
import SparklingIcon from '../../assets/Icons/sparkling-line.svg';
import { spacing, typeScale } from '../design/tokens';
import { useAppTheme } from '../design/theme';
import { BlockShadow, BlockShadowPressable } from './ui/block-shadow';
import { hasApiBaseUrl } from '../lib/env';
import {
  DEFAULT_PLAYER_SETTINGS,
  fetchPlayerSettings,
  normalizePlayerSettings,
  playerSettingsQueryDefaults,
  playerSettingsQueryKey,
  updatePlayerSettings,
  type PlayerSettings,
} from '../features/preferences/player-settings-api';
import { usePlayerStore } from '../state/player-store';

type RepeatMode = 'off' | 'all' | 'one';
type StoreLoopMode = 'off' | 'queue' | 'track';
const DARK_BUTTON_FILL = '#333333';
const LIGHT_THEME_TEXT_COLOR = '#222222';
const DARK_BUTTON_TEXT_COLOR = '#FFFFFF';
const DARK_BUTTON_ICON_COLOR = '#6EA06E';
const DARK_BORDER_COLOR = '#1A1A19';
const DARK_PRESSED_BUTTON_FILL = '#8F8F8F';
const MUSIC_CONTROL_ICON_SIZE = 18;
const ACCOUNT_MUSIC_CONTROL_ICON_SIZE = 22;
const OPTION_BUTTON_CONTENT_HEIGHT = 58;
const OPTION_BUTTON_SHADOW_OFFSET = 2;

function getNextRepeatMode(current: RepeatMode): RepeatMode {
  if (current === 'off') {
    return 'all';
  }

  if (current === 'all') {
    return 'one';
  }

  return 'off';
}

function toStoreLoopMode(loopMode: PlayerSettings['loopMode']): StoreLoopMode {
  return loopMode === 'list' ? 'queue' : loopMode;
}

type MusicPreferenceControlsProps = {
  layout?: 'account' | 'compact' | 'fill';
  showNormalization?: boolean;
};

type ActiveOptionMenu = 'humanSongs' | 'normalization' | 'repeat' | 'shuffle';

export function MusicPreferenceControls({ layout = 'compact', showNormalization = true }: MusicPreferenceControlsProps) {
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const setPlaybackSettings = usePlayerStore((state) => state.setPlaybackSettings);
  const [activeOptionMenu, setActiveOptionMenu] = useState<ActiveOptionMenu | null>(null);
  const [pendingSettings, setPendingSettings] = useState<PlayerSettings | null>(null);

  const playerSettingsQuery = useQuery({
    enabled: hasApiBaseUrl,
    queryFn: fetchPlayerSettings,
    queryKey: playerSettingsQueryKey,
    ...playerSettingsQueryDefaults,
  });

  const playerSettings = playerSettingsQuery.data ?? DEFAULT_PLAYER_SETTINGS;
  const visualSettings = pendingSettings ?? playerSettings;
  const repeatMode = visualSettings.loopMode === 'track' ? 'one' : visualSettings.loopMode === 'list' ? 'all' : 'off';
  const repeatVisuallyActive = repeatMode !== 'off';
  const controlsDisabled = hasApiBaseUrl && (playerSettingsQuery.isLoading || playerSettingsQuery.isError);

  useEffect(() => {
    if (!playerSettingsQuery.data) {
      return;
    }

    setPlaybackSettings({
      isNormalizationEnabled: playerSettingsQuery.data.normalizationEnabled,
      isShuffleEnabled: playerSettingsQuery.data.shuffle,
      loopMode: toStoreLoopMode(playerSettingsQuery.data.loopMode),
    });
  }, [playerSettingsQuery.data, setPlaybackSettings]);

  const playerSettingsMutation = useMutation({
    mutationFn: updatePlayerSettings,
    onMutate: async (nextSettings) => {
      await queryClient.cancelQueries({ queryKey: playerSettingsQueryKey });
      const previousSettings = queryClient.getQueryData<PlayerSettings>(playerSettingsQueryKey);

      setPendingSettings(nextSettings);
      queryClient.setQueryData(playerSettingsQueryKey, nextSettings);

      return { previousSettings };
    },
    onError: (_error, _nextSettings, context) => {
      setPendingSettings(null);
      if (context?.previousSettings) {
        queryClient.setQueryData(playerSettingsQueryKey, context.previousSettings);
      }
    },
    onSettled: () => {
      setPendingSettings(null);
    },
    onSuccess: (savedSettings) => {
      queryClient.setQueryData(playerSettingsQueryKey, savedSettings);
    },
  });
  const controlsLocked = controlsDisabled || playerSettingsMutation.isPending || pendingSettings !== null;

  function savePlayerSettings(updater: (settings: PlayerSettings) => PlayerSettings) {
    const nextSettings = normalizePlayerSettings(updater(visualSettings));
    setPendingSettings(nextSettings);
    setPlaybackSettings({
      isNormalizationEnabled: nextSettings.normalizationEnabled,
      isShuffleEnabled: nextSettings.shuffle,
      loopMode: toStoreLoopMode(nextSettings.loopMode),
    });
    playerSettingsMutation.mutate(nextSettings);
  }

  function toggleRepeat() {
    savePlayerSettings((current) => {
      const currentRepeatMode = current.loopMode === 'track' ? 'one' : current.loopMode === 'list' ? 'all' : 'off';
      const nextRepeatMode = getNextRepeatMode(currentRepeatMode);

      return {
        ...current,
        loopMode: nextRepeatMode === 'one' ? 'track' : nextRepeatMode === 'all' ? 'list' : 'off',
      };
    });
  }

  function selectRepeatMode(nextRepeatMode: RepeatMode) {
    setActiveOptionMenu(null);
    savePlayerSettings((current) => ({
      ...current,
      loopMode: nextRepeatMode === 'one' ? 'track' : nextRepeatMode === 'all' ? 'list' : 'off',
    }));
  }

  function selectSetting(update: Partial<Pick<PlayerSettings, 'normalizationEnabled' | 'showAiAssistedDiscoverSongs' | 'shuffle'>>) {
    setActiveOptionMenu(null);
    savePlayerSettings((current) => ({ ...current, ...update }));
  }

  const optionIconColor = theme.mode === 'dark' ? DARK_BUTTON_ICON_COLOR : LIGHT_THEME_TEXT_COLOR;

  const normalizationButton = showNormalization ? (
    <MusicModeButton
      active={visualSettings.normalizationEnabled}
      disabled={controlsLocked}
      renderIcon={(color) => <SparklingIcon color={color} height={layout === 'account' ? ACCOUNT_MUSIC_CONTROL_ICON_SIZE : MUSIC_CONTROL_ICON_SIZE} width={layout === 'account' ? ACCOUNT_MUSIC_CONTROL_ICON_SIZE : MUSIC_CONTROL_ICON_SIZE} />}
      label="Fix Volume"
      layout={layout}
      onLongPress={() => setActiveOptionMenu('normalization')}
      onPress={() => savePlayerSettings((current) => ({ ...current, normalizationEnabled: !current.normalizationEnabled }))}
      mode={theme.mode}
      styles={styles}
      visuallyDisabled={controlsDisabled}
    />
  ) : null;

  const humanSongsButton = (
    <MusicModeButton
      active={visualSettings.showAiAssistedDiscoverSongs}
      disabled={controlsLocked}
      renderIcon={(color) => <MusicIcon color={color} height={layout === 'account' ? ACCOUNT_MUSIC_CONTROL_ICON_SIZE : MUSIC_CONTROL_ICON_SIZE} width={layout === 'account' ? ACCOUNT_MUSIC_CONTROL_ICON_SIZE : MUSIC_CONTROL_ICON_SIZE} />}
      label={visualSettings.showAiAssistedDiscoverSongs ? 'All Songs' : 'Only Human'}
      layout={layout}
      onLongPress={() => setActiveOptionMenu('humanSongs')}
      onPress={() => savePlayerSettings((current) => ({ ...current, showAiAssistedDiscoverSongs: !current.showAiAssistedDiscoverSongs }))}
      mode={theme.mode}
      styles={styles}
      visuallyDisabled={controlsDisabled}
    />
  );

  const shuffleButton = (
    <MusicModeButton
      active={visualSettings.shuffle}
      disabled={controlsLocked}
      renderIcon={(color) => visualSettings.shuffle
        ? <ShuffleIcon color={color} height={layout === 'account' ? ACCOUNT_MUSIC_CONTROL_ICON_SIZE : MUSIC_CONTROL_ICON_SIZE} width={layout === 'account' ? ACCOUNT_MUSIC_CONTROL_ICON_SIZE : MUSIC_CONTROL_ICON_SIZE} />
        : <ArrowLeftRightIcon color={color} height={layout === 'account' ? ACCOUNT_MUSIC_CONTROL_ICON_SIZE : MUSIC_CONTROL_ICON_SIZE} width={layout === 'account' ? ACCOUNT_MUSIC_CONTROL_ICON_SIZE : MUSIC_CONTROL_ICON_SIZE} />}
      label="Shuffle"
      layout={layout}
      onLongPress={() => setActiveOptionMenu('shuffle')}
      onPress={() => savePlayerSettings((current) => ({ ...current, shuffle: !current.shuffle }))}
      mode={theme.mode}
      styles={styles}
      visuallyDisabled={controlsDisabled}
    />
  );

  const repeatButton = (
    <MusicModeButton
      active={repeatVisuallyActive}
      disabled={controlsLocked}
      renderIcon={(color) => repeatMode === 'one'
        ? <RepeatOneIcon color={color} height={layout === 'account' ? ACCOUNT_MUSIC_CONTROL_ICON_SIZE : MUSIC_CONTROL_ICON_SIZE} width={layout === 'account' ? ACCOUNT_MUSIC_CONTROL_ICON_SIZE : MUSIC_CONTROL_ICON_SIZE} />
        : repeatMode === 'off'
          ? <RepeatOffIcon color={color} />
          : <RepeatAllIcon color={color} height={layout === 'account' ? ACCOUNT_MUSIC_CONTROL_ICON_SIZE : MUSIC_CONTROL_ICON_SIZE} width={layout === 'account' ? ACCOUNT_MUSIC_CONTROL_ICON_SIZE : MUSIC_CONTROL_ICON_SIZE} />}
      label={repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : "Don't Repeat"}
      layout={layout}
      onLongPress={() => setActiveOptionMenu('repeat')}
      onPress={toggleRepeat}
      mode={theme.mode}
      styles={styles}
      visuallyDisabled={controlsDisabled}
    />
  );

  if (layout === 'account') {
    return (
      <>
        <View style={styles.accountPlaybackGroup}>
          <PlaybackSettingRow button={normalizationButton} description={visualSettings.normalizationEnabled ? 'Balances loud and quiet songs.' : 'Keeps original song loudness.'} styles={styles} />
          <View style={styles.accountPlaybackStack}>
            <PlaybackSettingRow button={humanSongsButton} description={visualSettings.showAiAssistedDiscoverSongs ? 'Human and AI-assisted songs show.' : 'Only human-made songs show.'} styles={styles} />
            <PlaybackSettingRow button={repeatButton} description={repeatMode === 'one' ? 'Repeats current song.' : repeatMode === 'all' ? 'Repeats the whole list.' : 'Stops after the list ends.'} styles={styles} />
            <PlaybackSettingRow button={shuffleButton} description={visualSettings.shuffle ? 'Plays songs in mixed order.' : 'Plays songs in list order.'} styles={styles} />
          </View>
        </View>

        {showNormalization ? <OptionMenuModal
          mode={theme.mode}
          onClose={() => setActiveOptionMenu(null)}
          options={[
            { description: 'Balances loud and quiet songs.', icon: <SparklingIcon color={optionIconColor} height={MUSIC_CONTROL_ICON_SIZE} width={MUSIC_CONTROL_ICON_SIZE} />, key: 'on', label: 'Fix Volume On', selected: visualSettings.normalizationEnabled },
            { description: 'Keeps original song loudness.', icon: <SparklingIcon color={optionIconColor} height={MUSIC_CONTROL_ICON_SIZE} width={MUSIC_CONTROL_ICON_SIZE} />, key: 'off', label: 'Fix Volume Off', selected: !visualSettings.normalizationEnabled },
          ]}
          onSelect={(key) => selectSetting({ normalizationEnabled: key === 'on' })}
          styles={styles}
          title="Fix Volume"
          visible={activeOptionMenu === 'normalization'}
        /> : null}
        <OptionMenuModal
          mode={theme.mode}
          onClose={() => setActiveOptionMenu(null)}
          options={[
            { description: 'Human and AI-assisted songs show.', icon: <MusicIcon color={optionIconColor} height={MUSIC_CONTROL_ICON_SIZE} width={MUSIC_CONTROL_ICON_SIZE} />, key: 'all', label: 'All Songs', selected: visualSettings.showAiAssistedDiscoverSongs },
            { description: 'Only human-made songs show.', icon: <MusicIcon color={optionIconColor} height={MUSIC_CONTROL_ICON_SIZE} width={MUSIC_CONTROL_ICON_SIZE} />, key: 'human', label: 'Only Human', selected: !visualSettings.showAiAssistedDiscoverSongs },
          ]}
          onSelect={(key) => selectSetting({ showAiAssistedDiscoverSongs: key === 'all' })}
          styles={styles}
          title="Songs"
          visible={activeOptionMenu === 'humanSongs'}
        />
        <OptionMenuModal
          mode={theme.mode}
          onClose={() => setActiveOptionMenu(null)}
          options={[
            { description: 'Stops after the list ends.', icon: <RepeatOffIcon color={theme.mode === 'dark' ? DARK_BUTTON_ICON_COLOR : LIGHT_THEME_TEXT_COLOR} />, key: 'off', label: "Don't Repeat", selected: repeatMode === 'off' },
            { description: 'Repeats the whole list.', icon: <RepeatAllIcon color={optionIconColor} height={MUSIC_CONTROL_ICON_SIZE} width={MUSIC_CONTROL_ICON_SIZE} />, key: 'all', label: 'Repeat All', selected: repeatMode === 'all' },
            { description: 'Repeats current song.', icon: <RepeatOneIcon color={optionIconColor} height={MUSIC_CONTROL_ICON_SIZE} width={MUSIC_CONTROL_ICON_SIZE} />, key: 'one', label: 'Repeat One', selected: repeatMode === 'one' },
          ]}
          onSelect={(key) => selectRepeatMode(key as RepeatMode)}
          styles={styles}
          title="Repeat"
          visible={activeOptionMenu === 'repeat'}
        />
        <OptionMenuModal
          mode={theme.mode}
          onClose={() => setActiveOptionMenu(null)}
          options={[
            { description: 'Plays songs in mixed order.', icon: <ShuffleIcon color={optionIconColor} height={MUSIC_CONTROL_ICON_SIZE} width={MUSIC_CONTROL_ICON_SIZE} />, key: 'on', label: 'Shuffle On', selected: visualSettings.shuffle },
            { description: 'Plays songs in list order.', icon: <ArrowLeftRightIcon color={optionIconColor} height={MUSIC_CONTROL_ICON_SIZE} width={MUSIC_CONTROL_ICON_SIZE} />, key: 'off', label: 'Shuffle Off', selected: !visualSettings.shuffle },
          ]}
          onSelect={(key) => selectSetting({ shuffle: key === 'on' })}
          styles={styles}
          title="Shuffle"
          visible={activeOptionMenu === 'shuffle'}
        />
      </>
    );
  }

  return (
    <>
      {normalizationButton}
      {humanSongsButton}
      {shuffleButton}
      {repeatButton}

      {showNormalization ? <OptionMenuModal
        mode={theme.mode}
        onClose={() => setActiveOptionMenu(null)}
        options={[
          { description: 'Balances loud and quiet songs.', icon: <SparklingIcon color={optionIconColor} height={MUSIC_CONTROL_ICON_SIZE} width={MUSIC_CONTROL_ICON_SIZE} />, key: 'on', label: 'Fix Volume On', selected: visualSettings.normalizationEnabled },
          { description: 'Keeps original song loudness.', icon: <SparklingIcon color={optionIconColor} height={MUSIC_CONTROL_ICON_SIZE} width={MUSIC_CONTROL_ICON_SIZE} />, key: 'off', label: 'Fix Volume Off', selected: !visualSettings.normalizationEnabled },
        ]}
        onSelect={(key) => selectSetting({ normalizationEnabled: key === 'on' })}
        styles={styles}
        title="Fix Volume"
        visible={activeOptionMenu === 'normalization'}
      /> : null}
      <OptionMenuModal
        mode={theme.mode}
        onClose={() => setActiveOptionMenu(null)}
        options={[
          { description: 'Human and AI-assisted songs show.', icon: <MusicIcon color={optionIconColor} height={MUSIC_CONTROL_ICON_SIZE} width={MUSIC_CONTROL_ICON_SIZE} />, key: 'all', label: 'All Songs', selected: visualSettings.showAiAssistedDiscoverSongs },
          { description: 'Only human-made songs show.', icon: <MusicIcon color={optionIconColor} height={MUSIC_CONTROL_ICON_SIZE} width={MUSIC_CONTROL_ICON_SIZE} />, key: 'human', label: 'Only Human', selected: !visualSettings.showAiAssistedDiscoverSongs },
        ]}
        onSelect={(key) => selectSetting({ showAiAssistedDiscoverSongs: key === 'all' })}
        styles={styles}
        title="Songs"
        visible={activeOptionMenu === 'humanSongs'}
      />
      <OptionMenuModal
        mode={theme.mode}
        onClose={() => setActiveOptionMenu(null)}
        options={[
          { description: 'Stops after the list ends.', icon: <RepeatOffIcon color={optionIconColor} />, key: 'off', label: "Don't Repeat", selected: repeatMode === 'off' },
          { description: 'Repeats the whole list.', icon: <RepeatAllIcon color={optionIconColor} height={MUSIC_CONTROL_ICON_SIZE} width={MUSIC_CONTROL_ICON_SIZE} />, key: 'all', label: 'Repeat All', selected: repeatMode === 'all' },
          { description: 'Repeats current song.', icon: <RepeatOneIcon color={optionIconColor} height={MUSIC_CONTROL_ICON_SIZE} width={MUSIC_CONTROL_ICON_SIZE} />, key: 'one', label: 'Repeat One', selected: repeatMode === 'one' },
        ]}
        onSelect={(key) => selectRepeatMode(key as RepeatMode)}
        styles={styles}
        title="Repeat"
        visible={activeOptionMenu === 'repeat'}
      />
      <OptionMenuModal
        mode={theme.mode}
        onClose={() => setActiveOptionMenu(null)}
        options={[
          { description: 'Plays songs in mixed order.', icon: <ShuffleIcon color={optionIconColor} height={MUSIC_CONTROL_ICON_SIZE} width={MUSIC_CONTROL_ICON_SIZE} />, key: 'on', label: 'Shuffle On', selected: visualSettings.shuffle },
          { description: 'Plays songs in list order.', icon: <ArrowLeftRightIcon color={optionIconColor} height={MUSIC_CONTROL_ICON_SIZE} width={MUSIC_CONTROL_ICON_SIZE} />, key: 'off', label: 'Shuffle Off', selected: !visualSettings.shuffle },
        ]}
        onSelect={(key) => selectSetting({ shuffle: key === 'on' })}
        styles={styles}
        title="Shuffle"
        visible={activeOptionMenu === 'shuffle'}
      />
    </>
  );
}

function OptionMenuModal({ mode, onClose, onSelect, options, styles, title, visible }: { mode: ReturnType<typeof useAppTheme>['mode']; onClose: () => void; onSelect: (key: string) => void; options: Array<{ description: string; icon: ReactNode; key: string; label: string; selected: boolean }>; styles: ReturnType<typeof createStyles>; title: string; visible: boolean }) {
  const contentColor = mode === 'dark' ? DARK_BUTTON_TEXT_COLOR : LIGHT_THEME_TEXT_COLOR;

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.tooltipRoot}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.tooltipBackdrop} />
        <BlockShadow contentStyle={styles.optionPanel} shadowOffset={4} style={styles.optionPanelShadow}>
          <Text style={styles.tooltipTitle}>{title}</Text>
          <View style={styles.optionList}>
            {options.map((option) => (
              <BlockShadowPressable
                accessibilityRole="button"
                contentStyle={[styles.optionAction, option.selected && styles.optionActionSelected]}
                key={option.key}
                onPress={() => onSelect(option.key)}
                pressedContentStyle={styles.pressed}
                shadowOffset={OPTION_BUTTON_SHADOW_OFFSET}
                shadowVisible={!option.selected}
                style={styles.optionActionShadow}
              >
                <View style={styles.optionActionTitleRow}>
                  {option.icon}
                  <Text style={[styles.optionLabel, { color: contentColor }]}>{option.label}</Text>
                </View>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </BlockShadowPressable>
            ))}
          </View>
        </BlockShadow>
      </View>
    </Modal>
  );
}

function PlaybackSettingRow({ button, description, styles }: { button: ReactNode; description: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.accountPlaybackLeadRow}>
      {button}
      <Text style={styles.accountPlaybackDescription}>{description}</Text>
    </View>
  );
}

function MusicModeButton({
  active,
  disabled = false,
  label,
  layout,
  mode,
  onLongPress,
  onPress,
  renderIcon,
  styles,
  visuallyDisabled = false,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  layout: NonNullable<MusicPreferenceControlsProps['layout']>;
  mode: ReturnType<typeof useAppTheme>['mode'];
  onLongPress: () => void;
  onPress: () => void;
  renderIcon: (color: string) => ReactNode;
  styles: ReturnType<typeof createStyles>;
  visuallyDisabled?: boolean;
}) {
  const longPressTriggeredRef = useRef(false);
  const contentColor = mode === 'dark' ? DARK_BUTTON_TEXT_COLOR : LIGHT_THEME_TEXT_COLOR;
  const iconColor = mode === 'dark' ? DARK_BUTTON_ICON_COLOR : contentColor;

  return (
    <BlockShadowPressable
      accessibilityRole="button"
      disabled={disabled}
      delayLongPress={260}
      onLongPress={() => {
        longPressTriggeredRef.current = true;
        onLongPress();
      }}
      onPress={() => {
        if (longPressTriggeredRef.current) {
          longPressTriggeredRef.current = false;
          return;
        }

        onPress();
      }}
      contentStyle={[styles.musicControlButton, (layout === 'fill' || layout === 'account') && styles.musicControlButtonFill, layout === 'account' && styles.musicControlButtonAccount, mode === 'light' && !active && styles.musicControlButtonLight, active && styles.musicControlButtonActive, visuallyDisabled && styles.musicControlButtonDisabled]}
      pressedContentStyle={styles.pressed}
      shadowOffset={2}
      shadowVisible={!active && !visuallyDisabled}
      style={[styles.musicControlButtonWrap, layout === 'fill' && styles.musicControlButtonWrapFill, layout === 'account' && styles.musicControlButtonWrapAccount]}
    >
      {renderIcon(iconColor)}
      <Text numberOfLines={1} style={[styles.musicControlLabel, { color: contentColor }]}>{label}</Text>
    </BlockShadowPressable>
  );
}

function RepeatOffIcon({ color }: { color: string }) {
  return (
    <View style={repeatOffIconStyles.wrap}>
      <RepeatAllIcon color={color} height={MUSIC_CONTROL_ICON_SIZE} width={MUSIC_CONTROL_ICON_SIZE} />
      <View style={[repeatOffIconStyles.slash, { backgroundColor: color }]} />
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const colors = theme.ui;

  return StyleSheet.create({
    accountPlaybackDescription: {
      color: colors.textSecondary,
      flex: 1,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.small,
      fontWeight: '700',
      lineHeight: 18,
      minWidth: 0,
    },
    accountPlaybackGroup: {
      gap: spacing.md,
    },
    accountPlaybackLeadRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
    },
    accountPlaybackStack: {
      gap: spacing.sm,
    },
    musicControlButton: {
      alignItems: 'center',
      backgroundColor: DARK_BUTTON_FILL,
      borderColor: theme.mode === 'dark' ? DARK_BORDER_COLOR : colors.borderStrong,
      borderWidth: 2,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'flex-start',
      minHeight: 42,
      paddingHorizontal: spacing.md,
    },
    musicControlButtonWrap: {
      flexBasis: 'auto',
      flexGrow: 0,
      minWidth: 0,
    },
    musicControlButtonWrapFill: {
      flexBasis: 0,
      flexGrow: 1,
      flexShrink: 1,
    },
    musicControlButtonWrapAccount: {
      flexBasis: 172,
      flexGrow: 0,
      flexShrink: 0,
    },
    musicControlButtonFill: {
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
    },
    musicControlButtonAccount: {
      minHeight: 64,
      paddingHorizontal: spacing.md,
    },
    musicControlButtonActive: {
      backgroundColor: theme.mode === 'dark' ? DARK_BUTTON_FILL : colors.buttonPrimary,
      transform: [{ translateX: 2 }, { translateY: 2 }],
    },
    musicControlButtonLight: {
      backgroundColor: colors.surfaceCard,
    },
    musicControlButtonDisabled: {
      opacity: 0.55,
    },
    musicControlLabel: {
      color: colors.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.small,
      fontWeight: '900',
    },
    optionAction: {
      alignItems: 'stretch',
      backgroundColor: theme.mode === 'dark' ? DARK_BUTTON_FILL : colors.surfaceCard,
      borderColor: colors.borderStrong,
      borderWidth: 2,
      gap: 2,
      height: OPTION_BUTTON_CONTENT_HEIGHT,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    optionActionShadow: {
      height: OPTION_BUTTON_CONTENT_HEIGHT + OPTION_BUTTON_SHADOW_OFFSET,
      width: '100%',
    },
    optionActionSelected: {
      backgroundColor: theme.mode === 'dark' ? DARK_BUTTON_FILL : colors.buttonPrimary,
      transform: [{ translateX: OPTION_BUTTON_SHADOW_OFFSET }, { translateY: OPTION_BUTTON_SHADOW_OFFSET }],
    },
    optionActionTitleRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    optionDescription: {
      color: colors.textSecondary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.fine,
      fontWeight: '700',
      lineHeight: 14,
      paddingLeft: MUSIC_CONTROL_ICON_SIZE + spacing.xs,
    },
    optionLabel: {
      color: colors.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.small,
      fontWeight: '900',
    },
    optionList: {
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    optionPanel: {
      backgroundColor: colors.surfaceCard,
      borderColor: colors.borderStrong,
      borderWidth: 3,
      padding: spacing.md,
      width: '100%',
    },
    optionPanelShadow: {
      maxWidth: 340,
      width: '86%',
    },
    pressed: {
      backgroundColor: theme.mode === 'dark' ? DARK_PRESSED_BUTTON_FILL : undefined,
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    tooltipBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlayScrim,
    },
    tooltipPanel: {
      backgroundColor: colors.surfaceCard,
      borderColor: colors.borderStrong,
      borderWidth: 3,
      padding: spacing.md,
      width: '100%',
    },
    tooltipPanelShadow: {
      maxWidth: 320,
      width: '82%',
    },
    tooltipRoot: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    tooltipText: {
      color: colors.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.body,
      fontWeight: '700',
      lineHeight: 22,
      marginTop: spacing.xs,
    },
    tooltipTitle: {
      color: colors.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.title,
      fontWeight: '900',
    },
  });
}

const repeatOffIconStyles = StyleSheet.create({
  slash: {
    height: 1.5,
    left: 1,
    position: 'absolute',
    top: 8,
    transform: [{ rotate: '-28deg' }],
    width: 14,
  },
  wrap: {
    alignItems: 'center',
    height: MUSIC_CONTROL_ICON_SIZE,
    justifyContent: 'center',
    position: 'relative',
    width: MUSIC_CONTROL_ICON_SIZE,
  },
});