export interface UserPermissionViewModel {
  module_name: string;
  permission_code: string;
  permission_name: string;
  value: string;
}

export interface UserRoleViewModel {
  role_id: number;
  role_code: string;
  role_name: string;
}

export interface UserAddressViewModel {
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

export interface UserPhoneViewModel {
  phone_id: number;
  phone_type_id: number | null;
  phone_type_name: string | null;
  phone_number: string;
  is_primary: boolean;
}

export interface UserEmailViewModel {
  email_id: number;
  email_type_id: number | null;
  email_type_name: string | null;
  email_address: string;
  is_primary: boolean;
}

export interface RelatedContactViewModel {
  contact_id: number;
  prefix_id: number | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix_id: number | null;
  contact_name: string;
  entity_type_id: number;
  addresses: UserAddressViewModel[];
  phones: UserPhoneViewModel[];
  emails: UserEmailViewModel[];
}

export interface ManagedUserDetailViewModel {
  account_id: number;
  user_name: string;
  full_name: string | null;
  is_active: boolean;
  contact_id: number | null;
  roles: UserRoleViewModel[];
  permissions: UserPermissionViewModel[];
  addresses: UserAddressViewModel[];
  phones: UserPhoneViewModel[];
  emails: UserEmailViewModel[];
  contacts: RelatedContactViewModel[];
  created_at: string;
}

export interface ManagedUserListItemViewModel {
  account_id: number;
  user_name: string;
  full_name: string | null;
  role_codes: string[];
  primary_email: string | null;
  primary_phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ManagedUserListViewModel {
  items: ManagedUserListItemViewModel[];
  total: number;
}
