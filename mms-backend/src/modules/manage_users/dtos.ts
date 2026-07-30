export interface AddressCreateRequest {
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
}

export interface AddressEditRequest extends AddressCreateRequest {}

export type AddressDto = AddressCreateRequest;

export interface PhoneDto {
  phone_id?: number;
  phone_type_id?: number | null;
  phone_number: string;
  is_primary?: boolean;
}

export interface EmailDto {
  email_id?: number;
  email_type_id?: number | null;
  email_address: string;
  is_primary?: boolean;
}

export interface ContactDto {
  contact_id?: number;
  prefix_id?: number | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix_id?: number | null;
  contact_name: string;
  entity_type_id?: number;
  addresses?: AddressDto[];
  phones?: PhoneDto[];
  emails?: EmailDto[];
}

export interface CreateManagedUserDto {
  user_name: string;
  password: string;
  full_name: string;
  is_active?: boolean;
  role_codes?: string[];
  addresses?: AddressDto[];
  phones?: PhoneDto[];
  emails?: EmailDto[];
  contacts?: ContactDto[];
}

export interface UpdateManagedUserDto {
  user_name?: string;
  password?: string;
  full_name?: string;
  is_active?: boolean;
  role_codes?: string[];
  addresses?: AddressDto[];
  phones?: PhoneDto[];
  emails?: EmailDto[];
  contacts?: ContactDto[];
  deleted_contact_ids?: number[];
}
