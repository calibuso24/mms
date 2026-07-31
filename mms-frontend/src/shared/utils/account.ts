import { CurrentAccount } from '../types/account.js';

export function getAccountDisplayName(account: CurrentAccount | null | undefined): string {
  return account?.full_name?.trim() || account?.user_name?.trim() || 'User';
}

export function getAccountInitials(displayName: string): string {
  const parts = displayName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return 'U';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function getAccountAvatarSrc(account: CurrentAccount | null | undefined): string | null {
  return account?.profile?.avatar?.data_url ?? null;
}