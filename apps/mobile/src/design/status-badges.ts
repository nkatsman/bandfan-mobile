export type StatusBadgeStyle = {
  fillColor: string;
  textColor: string;
};

const REF_INK = '#222222';
const REF_WHITE = '#FFFFFF';

const defaultStatusBadgeStyle: StatusBadgeStyle = { fillColor: '#8373B3', textColor: REF_WHITE };

const statusBadgeStyles: Record<string, StatusBadgeStyle> = {
  default: defaultStatusBadgeStyle,
  demo: { fillColor: '#8373B3', textColor: REF_WHITE },
  discover: { fillColor: '#8373B3', textColor: REF_WHITE },
  mastered: { fillColor: '#DFAC53', textColor: REF_INK },
  mixed: { fillColor: '#8FACCE', textColor: REF_INK },
  recorded: { fillColor: '#6EA06E', textColor: REF_INK },
  recording: { fillColor: '#6EA06E', textColor: REF_INK },
  released: { fillColor: '#EF4343', textColor: REF_WHITE },
  senttostores: { fillColor: '#E7BF7B', textColor: REF_INK },
};

function normalizeStatusLabel(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeStatusText(label: string) {
  const normalized = normalizeStatusLabel(label);

  if (normalized === 'senttostores') {
    return 'sent to stores';
  }

  return normalized || 'demo';
}

function getStatusDisplayLabel(statusLabel: string) {
  return normalizeStatusText(statusLabel).replace(/\b\w/g, (match) => match.toUpperCase());
}

function getStatusDescription(statusLabel: string) {
  const normalized = normalizeStatusText(statusLabel);

  if (normalized === 'demo' || normalized === 'discover') {
    return 'Early version. It may sound rough, but it should give the general idea of the song.';
  }

  if (normalized === 'recorded' || normalized === 'recording') {
    return 'Most or all parts are composed and recorded; next step is mixing.';
  }

  if (normalized === 'mixed') {
    return 'The recorded parts are balanced so the song sounds good together in the studio environment.';
  }

  if (normalized === 'mastered') {
    return 'Final version that\'s supposed to sound well across all speakers, headphones, and players.';
  }

  if (normalized === 'sent to stores') {
    return 'The song is ready and scheduled for release.';
  }

  if (normalized === 'released') {
    return 'Officially out and available to listeners.';
  }

  return 'Current release stage for this song.';
}

function getStatusBadgeStyle(statusLabel: string): StatusBadgeStyle {
  const normalized = normalizeStatusLabel(statusLabel);

  return statusBadgeStyles[normalized] ?? defaultStatusBadgeStyle;
}

export { getStatusBadgeStyle, getStatusDescription, getStatusDisplayLabel, normalizeStatusText };
export default getStatusBadgeStyle;