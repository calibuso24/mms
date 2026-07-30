import {
  AddressDto,
  PhoneDto,
  EmailDto,
  ContactDto,
} from '../manage_users/dtos.js';

export interface PartyBaseUpsertDto {
  status_id?: number;
  description?: string | null;
  addresses?: AddressDto[];
  phones?: PhoneDto[];
  emails?: EmailDto[];
  contacts?: ContactDto[];
  deleted_contact_ids?: number[];
}

export interface CreateProjectDto extends PartyBaseUpsertDto {
  project_code: string;
  project_name: string;
  project_type_id?: number | null;
}

export interface UpdateProjectDto extends PartyBaseUpsertDto {
  project_code?: string;
  project_name?: string;
  project_type_id?: number | null;
}

export interface CreateSupplierDto extends PartyBaseUpsertDto {
  supplier_code: string;
  supplier_name: string;
  payment_terms_id?: number | null;
  business_hours?: string | null;
}

export interface UpdateSupplierDto extends PartyBaseUpsertDto {
  supplier_code?: string;
  supplier_name?: string;
  payment_terms_id?: number | null;
  business_hours?: string | null;
}
