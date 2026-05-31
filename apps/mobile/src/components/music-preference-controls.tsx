import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import MusicIcon from '../../assets/Icons/music-fill.svg';
import RepeatAllIcon from '../../assets/Icons/repeat-2-fill.svg';
import RepeatOneIcon from '../../assets/Icons/repeat-one-fill.svg';
import ShuffleIcon from '../../assets/Icons/shuffle-fill.svg';
import SparklingIcon from '../../assets/Icons/sparkling-line.svg';
import { spacing, typeScale } from '../design/tokens';
import { useAppTheme } from '../design/theme';
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

type RepeatMode = 'off' | 'all' | 'one';
const DARK_GREY_BUTTON_FILL = '#3A3A38';
const LIGHT_THEME_TEXT_COLOR = '#222220';

function getNextRepeatMode(current: RepeatMode): RepeatMode {
  if (current === 'off') {
    return 'all';
  }

  if (current === 'all') {
    return 'one';
  }

  return 'off';
}

export function MusicPreferenceControls() {
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const styles = useMemo(() => createStyles(theme.ui), [theme.ui]);
  const [activeHelp, setActiveHelp] = useState<{ label: string; text: string } | null>(null);
  const [repeatButtonReleased, setRepeatButtonReleased] = useState(false);
  const repeatBounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playerSettingsQuery = useQuery({
    enabled: hasApiBaseUrl,
    queryFn: fetchPlayerSettings,
    queryKey: playerSettingsQueryKey,
    ...playerSettingsQueryDefaults,
  });

  const playerSettings = playerSettingsQuery.data ?? DEFAULT_PLAYER_SETTINGS;
  const repeatMode = playerSettings.loopMode === 'track' ? 'one' : playerSettings.loopMode === 'list' ? 'all' : 'off';
  const repeatVisuallyActive = repeatMode !== 'off' && !repeatButtonReleased;
  const controlsDisabled = hasApiBaseUrl && (playerSettingsQuery.isLoading || playerSettingsQuery.isError);

  const playerSettingsMutation = useMutation({
    mutationFn: updatePlayerSettings,
    onMutate: async (nextSettings) => {
      await queryClient.cancelQueries({ queryKey: playerSettingsQueryKey });
      const previousSettings = queryClient.getQueryData<PlayerSettings>(playerSettingsQueryKey);

      queryClient.setQueryData(playerSettingsQueryKey, nextSettings);

      return { previousSettings };
    },
    onError: (_error, _nextSettings, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(playerSettingsQueryKey, context.previousSettings);
      }
    },
    onSuccess: (savedSettings) => {
      queryClient.setQueryData(playerSettingsQueryKey, savedSettings);
    },
  });

  function savePlayerSettings(updater: (settings: PlayerSettings) => PlayerSettings) {
    const nextSettings = normalizePlayerSettings(updater(playerSettings));
    playerSettingsMutation.mutate(nextSettings);
  }

  function toggleRepeat() {
    savePlayerSettings((current) => {
      const currentRepeatMode = current.loopMode === 'track' ? 'one' : current.loopMode === 'list' ? 'all' : 'off';
      const nextRepeatMode = getNextRepeatMode(currentRepeatMode);

      if (currentRepeatMode !== 'off' && nextRepeatMode !== 'off') {
        setRepeatButtonReleased(true);

        if (repeatBounceTimeoutRef.current) {
          clearTimeout(repeatBounceTimeoutRef.current);
        }

        repeatBounceTimeoutRef.current = setTimeout(() => {
          setRepeatButtonReleased(false);
          repeatBounceTimeoutRef.current = null;
        }, 140);
      }

      return {
        ...current,
        loopMode: nextRepeatMode === 'one' ? 'track' : nextRepeatMode === 'all' ? 'list' : 'off',
      };
    });
  }

  useEffect(() => () => {
    if (repeatBounceTimeoutRef.current) {
      clearTimeout(repeatBounceTimeoutRef.current);
    }
  }, []);

  return (
    <>
      <MusicModeButton
        active={playerSettings.normalizationEnabled}
        disabled={controlsDisabled}
        helpText={playerSettings.normalizationEnabled
          ? 'Keeps track volume more even, useful because unreleased songs are not always mastered the same way.'
          : 'Turn on to even out loud and quiet tracks while you listen.'}
        renderIcon={(color) => <SparklingIcon color={color} height={16} width={16} />}
        label="Fix Volume"
        onHelp={setActiveHelp}
        onPress={() => savePlayerSettings((current) => ({ ...current, normalizationEnabled: !current.normalizationEnabled }))}
        textColor={theme.ui.textPrimary}
        styles={styles}
      />

      <MusicModeButton
        active={playerSettings.showAiAssistedDiscoverSongs}
        disabled={controlsDisabled}
        helpText={playerSettings.showAiAssistedDiscoverSongs
          ? 'Shows both human-made and AI-assisted songs in discovery.'
          : 'Hides AI-assisted songs from discovery.'}
        renderIcon={(color) => <MusicIcon color={color} height={16} width={16} />}
        label={playerSettings.showAiAssistedDiscoverSongs ? 'All Songs' : 'Human Only'}
        onHelp={setActiveHelp}
        onPress={() => savePlayerSettings((current) => ({ ...current, showAiAssistedDiscoverSongs: !current.showAiAssistedDiscoverSongs }))}
        textColor={theme.ui.textPrimary}
        styles={styles}
      />

      <MusicModeButton
        active={playerSettings.shuffle}
        disabled={controlsDisabled}
        helpText={playerSettings.shuffle
          ? 'Plays songs in a mixed order instead of going straight down the list.'
          : 'Turn on to mix the play order.'}
        renderIcon={(color) => <ShuffleIcon color={color} height={16} width={16} />}
        label="Shuffle"
        onHelp={setActiveHelp}
        onPress={() => savePlayerSettings((current) => ({ ...current, shuffle: !current.shuffle }))}
        textColor={theme.ui.textPrimary}
        styles={styles}
      />

      <MusicModeButton
        active={repeatVisuallyActive}
        disabled={controlsDisabled}
        helpText={repeatMode === 'one'
          ? 'Repeats the current song until you change this setting.'
          : repeatMode === 'all'
            ? 'Repeats the current list after the last song finishes.'
            : 'Stops after the current list finishes.'}
        renderIcon={(color) => repeatMode === 'one'
          ? <RepeatOneIcon color={color} height={16} width={16} />
          : repeatMode === 'off'
            ? <RepeatOffIcon color={color} />
            : <RepeatAllIcon color={color} height={16} width={16} />}
        label={repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : "Don't Repeat"}
        onHelp={setActiveHelp}
        onPress={toggleRepeat}
        textColor={theme.ui.textPrimary}
        styles={styles}
      />

      <Modal animationType="fade" onRequestClose={() => setActiveHelp(null)} transparent visible={Boolean(activeHelp)}>
        <View style={styles.tooltipRoot}>
          <Pressable accessibilityRole="button" onPress={() => setActiveHelp(null)} style={styles.tooltipBackdrop} />
          <View style={styles.tooltipPanel}>
            <Text style={styles.tooltipTitle}>{activeHelp?.label}</Text>
            <Text style={styles.tooltipText}>{activeHelp?.text}</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

function MusicModeButton({
  active,
  disabled = false,
  label,
  helpText,
  onHelp,
  onPress,
  renderIcon,
  styles,
  textColor,
}: {
  active: boolean;
  disabled?: boolean;
  helpText: string;
  label: string;
  onHelp: (help: { label: string; text: string }) => void;
  onPress: () => void;
  renderIcon: (color: string) => ReactNode;
  styles: ReturnType<typeof createStyles>;
  textColor: string;
}) {
  const longPressTriggeredRef = useRef(false);
  const contentColor = active ? LIGHT_THEME_TEXT_COLOR : textColor;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      delayLongPress={260}
      onLongPress={() => {
        longPressTriggeredRef.current = true;
        onHelp({ label, text: helpText });
      }}
      onPress={() => {
        if (longPressTriggeredRef.current) {
          longPressTriggeredRef.current = false;
          return;
        }

        onPress();
      }}
      style={({ pressed }) => [styles.musicControlButton, active && styles.musicControlButtonActive, disabled && styles.musicControlButtonDisabled, pressed && !disabled && styles.pressed]}
    >
      {renderIcon(contentColor)}
      <Text style={[styles.musicControlLabel, active && styles.musicControlLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function RepeatOffIcon({ color }: { color: string }) {
  return (
    <View style={repeatOffIconStyles.wrap}>
      <RepeatAllIcon color={color} height={16} width={16} />
      <View style={[repeatOffIconStyles.slash, { backgroundColor: color }]} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['ui']) {
  return StyleSheet.create({
    musicControlButton: {
      alignItems: 'center',
      backgroundColor: DARK_GREY_BUTTON_FILL,
      borderColor: colors.borderStrong,
      borderWidth: 2,
      flexBasis: '48%',
      flexDirection: 'row',
      flexGrow: 1,
      gap: 6,
      justifyContent: 'center',
      minHeight: 34,
      minWidth: 0,
      paddingHorizontal: spacing.sm,
      shadowColor: '#000000',
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
    },
    musicControlButtonActive: {
      backgroundColor: colors.buttonPrimary,
      shadowOpacity: 0,
      transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    musicControlButtonDisabled: {
      opacity: 0.55,
    },
    musicControlLabel: {
      color: colors.textPrimary,
      fontFamily: 'IBMPlexMono',
      fontSize: typeScale.fine,
      fontWeight: '700',
    },
    musicControlLabelActive: {
      color: LIGHT_THEME_TEXT_COLOR,
    },
    pressed: {
      shadowOpacity: 0,
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
      maxWidth: 320,
      padding: spacing.md,
      shadowColor: '#000000',
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 0,
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
    top: 7,
    transform: [{ rotate: '-28deg' }],
    width: 14,
  },
  wrap: {
    alignItems: 'center',
    height: 16,
    justifyContent: 'center',
    position: 'relative',
    width: 16,
  },
});