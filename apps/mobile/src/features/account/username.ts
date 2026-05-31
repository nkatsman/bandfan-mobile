const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 24;
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,22}[a-z0-9])?$/;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function getUsernameValidationError(value: string) {
  if (!value) {
    return null;
  }

  if (value.length < USERNAME_MIN_LENGTH || value.length > USERNAME_MAX_LENGTH) {
    return `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters.`;
  }

  if (!USERNAME_PATTERN.test(value)) {
    return 'Username can use lowercase letters, numbers, dots, underscores, and hyphens.';
  }

  return null;
}