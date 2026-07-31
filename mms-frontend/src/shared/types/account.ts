export interface AccountProfileAvatar {
  data_url: string | null;
  updated_at: string | null;
}

export interface AccountProfilePreferences {
  theme: string | null;
  language: string | null;
  date_format: string | null;
  time_format: string | null;
  time_zone: string | null;
  notifications: {
    email: boolean;
    sms: boolean;
    in_app: boolean;
  };
}

export interface AccountProfileSecurity {
  last_login_at: string | null;
  last_password_change_at: string | null;
}

export interface AccountProfile {
  avatar: AccountProfileAvatar | null;
  preferences: AccountProfilePreferences | null;
  security: AccountProfileSecurity | null;
}

export interface AccountContact {
  contact_id: number;
  parent_contact_id: number | null;
  entity_type_id: number;
  prefix_id: number | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix_id: number | null;
  contact_name: string;
}

export interface AccountAddress {
  address_id: number;
  address_type_id: number | null;
  address_type_name: string | null;
  address_label: string;
  house_no: string | null;
  street: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  country_code: string | null;
  postal_code: string | null;
  is_primary: boolean;
}

export interface AccountPhone {
  phone_id: number;
  phone_type_id: number | null;
  phone_type_name: string | null;
  phone_number: string;
  is_primary: boolean;
}

export interface AccountEmail {
  email_id: number;
  email_type_id: number | null;
  email_type_name: string | null;
  email_address: string;
  is_primary: boolean;
}

export interface AccountPermission {
  module_name: string;
  permission_code: string;
  permission_name: string;
  value: string;
}

export interface AccountRole {
  role_id: number;
  role_code: string;
  role_name: string;
}

export interface CurrentAccount {
  account_id: number;
  user_name: string;
  full_name: string | null;
  is_active: boolean;
  contact_id: number | null;
  profile: AccountProfile | null;
  contact: AccountContact | null;
  roles?: AccountRole[];
  permissions?: AccountPermission[];
  addresses?: AccountAddress[];
  phones?: AccountPhone[];
  emails?: AccountEmail[];
  created_at?: string;
}

export interface UpdateCurrentAccountProfileRequest {
  display_name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  avatar_data_url?: string | null;
  preferences?: {
    theme?: string | null;
    language?: string | null;
    date_format?: string | null;
    time_format?: string | null;
    time_zone?: string | null;
    notifications?: {
      email?: boolean;
      sms?: boolean;
      in_app?: boolean;
    };
  } | null;
  addresses?: Array<{
    address_id?: number;
    address_type_id?: number | null;
    house_no?: string | null;
    street?: string | null;
    barangay?: string | null;
    city?: string | null;
    province?: string | null;
    region?: string | null;
    postal_code?: string | null;
    is_primary?: boolean;
  }>;
  phones?: Array<{
    phone_id?: number;
    phone_type_id?: number | null;
    phone_number: string;
    is_primary?: boolean;
  }>;
  emails?: Array<{
    email_id?: number;
    email_type_id?: number | null;
    email_address: string;
    is_primary?: boolean;
  }>;
}