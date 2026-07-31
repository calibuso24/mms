export interface UserProfileAvatar {
	data_url?: string | null;
	updated_at?: string | null;
}

export interface UserProfilePreferences {
	theme?: string | null;
	language?: string | null;
	date_format?: string | null;
	time_format?: string | null;
	time_zone?: string | null;
	notifications?: {
		email?: boolean | null;
		sms?: boolean | null;
		in_app?: boolean | null;
	} | null;
}

export interface UserProfileSecurity {
	last_login_at?: string | null;
	last_password_change_at?: string | null;
}

export interface UserProfileData {
	avatar?: UserProfileAvatar | null;
	preferences?: UserProfilePreferences | null;
	security?: UserProfileSecurity | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeValue(currentValue: unknown, patchValue: unknown): unknown {
	if (!isPlainObject(currentValue) || !isPlainObject(patchValue)) {
		return patchValue;
	}

	const merged: Record<string, unknown> = { ...currentValue };
	for (const [key, value] of Object.entries(patchValue)) {
		if (value === undefined) {
			continue;
		}

		merged[key] = mergeValue(currentValue[key], value);
	}

	return merged;
}

export function mergeUserProfile(
	currentProfile: UserProfileData | null | undefined,
	patch: Partial<UserProfileData> | null | undefined
): UserProfileData | null {
	if (!patch) {
		return currentProfile ?? null;
	}

	const current = currentProfile ?? {};
	const merged: Record<string, unknown> = { ...current };

	for (const [key, value] of Object.entries(patch)) {
		if (value === undefined) {
			continue;
		}

		merged[key] = mergeValue((current as Record<string, unknown>)[key], value);
	}

	return merged as UserProfileData;
}