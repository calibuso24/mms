import {
  UserAddressViewModel,
  UserPhoneViewModel,
  UserEmailViewModel,
  RelatedContactViewModel,
} from '../manage_users/viewModels.js';

export interface PartyListItemViewModel {
  party_id: number;
  status_id: number;
  status_name: string;
  party_code: string;
  party_name: string;
  created_at: string | null;
}

export interface ProjectListItemViewModel extends PartyListItemViewModel {
  project_code: string;
  project_name: string;
  project_type_id: number | null;
  project_type_name: string | null;
}

export interface SupplierListItemViewModel extends PartyListItemViewModel {
  supplier_code: string;
  supplier_name: string;
  payment_terms_id: number | null;
  payment_terms_name: string | null;
  business_hours_schedule: SupplierBusinessHourViewModel[];
}

export interface SupplierBusinessHourViewModel {
  day_of_week: number;
  is_closed: boolean;
  opening_time: string | null;
  closing_time: string | null;
}

export interface PartyDetailViewModel {
  party_id: number;
  contact_id: number;
  status_id: number;
  status_name: string;
  description: string | null;
  addresses: UserAddressViewModel[];
  phones: UserPhoneViewModel[];
  emails: UserEmailViewModel[];
  contacts: RelatedContactViewModel[];
  created_at: string | null;
  updated_at: string | null;
}

export interface ProjectDetailViewModel extends PartyDetailViewModel {
  project_code: string;
  project_name: string;
  project_type_id: number | null;
  project_type_name: string | null;
}

export interface SupplierDetailViewModel extends PartyDetailViewModel {
  supplier_code: string;
  supplier_name: string;
  payment_terms_id: number | null;
  payment_terms_name: string | null;
  business_hours_schedule: SupplierBusinessHourViewModel[];
}

export interface PartyListViewModel<T> {
  items: T[];
  total: number;
}
