import { useEffect } from 'react';
import { Platform } from 'react-native';

export const ALLOW_SELECT_DATA_ATTR = 'data-allow-select';
export const ALLOW_COPY_DATA_ATTR = 'data-allow-copy';

function isWithinExclusion(target: EventTarget | null, dataAttribute: string): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest(`[${dataAttribute}="true"]`));
}

export function AppContentProtection() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const styleId = 'bandfan-mobile-content-protection';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = `
        html, body, #root {
          -webkit-user-select: none;
          user-select: none;
        }

        input,
        textarea,
        input:focus,
        textarea:focus {
          outline: none !important;
          box-shadow: none !important;
        }

        input::placeholder,
        textarea::placeholder {
          font-family: inherit;
          font-size: inherit;
          font-weight: inherit;
          line-height: inherit;
        }

        button:active,
        button[aria-pressed="true"],
        [data-state="on"],
        [data-state="active"] {
          box-shadow: none !important;
        }

        [${ALLOW_SELECT_DATA_ATTR}="true"],
        [${ALLOW_SELECT_DATA_ATTR}="true"] * {
          -webkit-user-select: text !important;
          user-select: text !important;
        }
      `;
      document.head.appendChild(styleElement);
    }

    const handleSelectStart = (event: Event) => {
      if (!isWithinExclusion(event.target, ALLOW_SELECT_DATA_ATTR)) {
        event.preventDefault();
      }
    };

    const handleCopyLikeEvent = (event: ClipboardEvent) => {
      if (!isWithinExclusion(event.target, ALLOW_COPY_DATA_ATTR)) {
        event.preventDefault();
      }
    };

    const handleKeyboardCopy = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isCopyShortcut = (event.ctrlKey || event.metaKey) && (key === 'c' || key === 'x');

      if (isCopyShortcut && !isWithinExclusion(event.target, ALLOW_COPY_DATA_ATTR)) {
        event.preventDefault();
      }
    };

    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('copy', handleCopyLikeEvent);
    document.addEventListener('cut', handleCopyLikeEvent);
    document.addEventListener('keydown', handleKeyboardCopy);

    return () => {
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('copy', handleCopyLikeEvent);
      document.removeEventListener('cut', handleCopyLikeEvent);
      document.removeEventListener('keydown', handleKeyboardCopy);
    };
  }, []);

  return null;
}
