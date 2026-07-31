import { PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { pool } from '../config/database.js';
import { ContactRepository } from '../repositories/contact.js';
import { LookupRepository } from '../repositories/lookup.js';
import { PartyRepository, PartyListRow } from '../repositories/party.js';
import { AuditLogRepository } from '../repositories/auditLog.js';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreateSupplierDto,
  UpdateSupplierDto,
  SupplierBusinessHourDto,
} from '../modules/party/dtos.js';
import {
  PartyListViewModel,
  ProjectListItemViewModel,
  SupplierListItemViewModel,
  ProjectDetailViewModel,
  SupplierDetailViewModel,
  SupplierBusinessHourViewModel,
} from '../modules/party/viewModels.js';
import {
  AddressDto,
  PhoneDto,
  EmailDto,
  ContactDto,
} from '../modules/manage_users/dtos.js';
import {
  UserAddressViewModel,
  UserPhoneViewModel,
  UserEmailViewModel,
  RelatedContactViewModel,
} from '../modules/manage_users/viewModels.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../utils/errors.js';

const PARTY_TYPE_LOOKUP = 'party_type';
const PARTY_STATUS_LOOKUP = 'party_status';
const PROJECT_TYPE_LOOKUP = 'project_type';
const PAYMENT_TERMS_LOOKUP = 'payment_terms';
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7];

export class PartyService {
  private partyRepository = new PartyRepository();
  private lookupRepository = new LookupRepository();
  private contactRepository = new ContactRepository();
  private auditLogRepository = new AuditLogRepository();

  async listProjects(
    limit: number = 50,
    offset: number = 0,
    search?: string,
    sortBy?: string,
    sortDir?: 'asc' | 'desc'
  ): Promise<PartyListViewModel<ProjectListItemViewModel>> {
    const projectTypeId = await this.requireLookupIdByCode(PARTY_TYPE_LOOKUP, 'project');
    const { rows, total } = await this.partyRepository.findAllByType(
      projectTypeId,
      limit,
      offset,
      search,
      sortBy,
      sortDir
    );

    return {
      items: rows.map((row) => this.mapProjectListRow(row)),
      total,
    };
  }

  async getProject(projectId: number): Promise<ProjectDetailViewModel> {
    return this.getProjectByPartyId(projectId, undefined);
  }

  async createProject(
    dto: CreateProjectDto,
    createdByAccountId?: number
  ): Promise<ProjectDetailViewModel> {
    this.validateProjectCreate(dto);

    const existingByCode = await this.partyRepository.findByCode(dto.project_code);
    if (existingByCode) {
      throw new ConflictError('Project code already exists');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      const partyTypeId = await this.requireLookupIdByCode(PARTY_TYPE_LOOKUP, 'project', client);
      const statusId = dto.status_id ?? (await this.requireLookupIdByCode(PARTY_STATUS_LOOKUP, 'active', client));

      await this.assertLookupType(statusId, PARTY_STATUS_LOOKUP, 'status_id', client);
      await this.assertLookupTypeIfProvided(dto.project_type_id, PROJECT_TYPE_LOOKUP, 'project_type_id', client);
      await this.assertEmailsUnique(this.collectEmails(dto), undefined, client);

      const companyEntityTypeId = await this.getCompanyEntityTypeId(client);
      const rootContact = await this.contactRepository.create(
        companyEntityTypeId,
        dto.project_name,
        null,
        createdByAccountId ?? null,
        client
      );

      const created = await this.partyRepository.create(
        {
          contact_id: rootContact.contact_id,
          party_code: dto.project_code.trim(),
          party_name: dto.project_name.trim(),
          party_type_id: partyTypeId,
          status_id: statusId,
          description: dto.description ?? null,
          project_type_id: dto.project_type_id ?? null,
          payment_terms_id: null,
          business_hours: null,
        },
        createdByAccountId ?? null,
        'project_management',
        client
      );

      await this.syncAddresses(rootContact.contact_id, dto.addresses, createdByAccountId ?? null, client);
      await this.syncPhones(rootContact.contact_id, dto.phones, createdByAccountId ?? null, client);
      await this.syncEmails(rootContact.contact_id, dto.emails, createdByAccountId ?? null, client);
      await this.syncRelatedContacts(
        rootContact.contact_id,
        dto.contacts,
        [],
        createdByAccountId ?? null,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'party',
          entityId: created.party_id,
          operation: 'CREATE',
          changedBy: createdByAccountId ?? null,
          changes: {
            party_type: 'project',
            project_code: dto.project_code,
            project_name: dto.project_name,
            status_id: statusId,
            project_type_id: dto.project_type_id ?? null,
          },
          transactionId,
          notes: 'Project created via Project Management',
          moduleName: 'project_management',
        },
        client
      );

      await client.query('COMMIT');
      return this.getProjectByPartyId(created.party_id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateProject(
    projectId: number,
    dto: UpdateProjectDto,
    updatedByAccountId?: number
  ): Promise<ProjectDetailViewModel> {
    const existing = await this.getProjectByPartyId(projectId);
    const existingCode = existing.project_code;

    if (dto.project_name !== undefined && dto.project_name.trim().length === 0) {
      throw new ValidationError('Project name is required');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      if (dto.project_code && dto.project_code !== existingCode) {
        const duplicate = await this.partyRepository.findByCode(dto.project_code, client);
        if (duplicate && duplicate.party_id !== projectId) {
          throw new ConflictError('Project code already exists');
        }
      }

      if (dto.status_id !== undefined) {
        await this.assertLookupType(dto.status_id, PARTY_STATUS_LOOKUP, 'status_id', client);
      }

      await this.assertLookupTypeIfProvided(dto.project_type_id, PROJECT_TYPE_LOOKUP, 'project_type_id', client);

      const partyRow = await this.partyRepository.findById(projectId, client);
      if (!partyRow) {
        throw new NotFoundError('Project not found');
      }

      await this.assertEmailsUnique(this.collectEmails(dto), partyRow.contact_id, client);

      await this.partyRepository.update(
        projectId,
        {
          party_code: dto.project_code?.trim(),
          party_name: dto.project_name?.trim(),
          status_id: dto.status_id,
          description: dto.description,
          project_type_id: dto.project_type_id,
          payment_terms_id: null,
          business_hours: null,
        },
        updatedByAccountId ?? null,
        'project_management',
        client
      );

      if (dto.project_name !== undefined) {
        await this.contactRepository.update(
          partyRow.contact_id,
          { contact_name: dto.project_name.trim() },
          updatedByAccountId ?? null,
          client
        );
      }

      await this.syncAddresses(partyRow.contact_id, dto.addresses, updatedByAccountId ?? null, client);
      await this.syncPhones(partyRow.contact_id, dto.phones, updatedByAccountId ?? null, client);
      await this.syncEmails(partyRow.contact_id, dto.emails, updatedByAccountId ?? null, client);
      await this.syncRelatedContacts(
        partyRow.contact_id,
        dto.contacts,
        dto.deleted_contact_ids ?? [],
        updatedByAccountId ?? null,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'party',
          entityId: projectId,
          operation: 'UPDATE',
          changedBy: updatedByAccountId ?? null,
          changes: dto as unknown as Record<string, unknown>,
          transactionId,
          notes: 'Project updated via Project Management',
          moduleName: 'project_management',
        },
        client
      );

      await client.query('COMMIT');
      return this.getProjectByPartyId(projectId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteProject(projectId: number, deletedByAccountId?: number): Promise<void> {
    const project = await this.getProjectByPartyId(projectId);

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.partyRepository.softDelete(
        projectId,
        deletedByAccountId ?? null,
        'project_management',
        client
      );

      await this.softDeleteContactTree(project.contact_id, deletedByAccountId ?? null, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'party',
          entityId: projectId,
          operation: 'DELETE',
          changedBy: deletedByAccountId ?? null,
          changes: {
            party_type: 'project',
            project_code: project.project_code,
            project_name: project.project_name,
          },
          transactionId,
          notes: 'Project soft deleted via Project Management',
          moduleName: 'project_management',
        },
        client
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listSuppliers(
    limit: number = 50,
    offset: number = 0,
    search?: string,
    sortBy?: string,
    sortDir?: 'asc' | 'desc'
  ): Promise<PartyListViewModel<SupplierListItemViewModel>> {
    const supplierTypeId = await this.requireLookupIdByCode(PARTY_TYPE_LOOKUP, 'supplier');
    const { rows, total } = await this.partyRepository.findAllByType(
      supplierTypeId,
      limit,
      offset,
      search,
      sortBy,
      sortDir
    );
    const schedules = await this.partyRepository.listBusinessHoursBySupplierIds(rows.map((row) => row.party_id));

    const scheduleBySupplierId = new Map<number, SupplierBusinessHourViewModel[]>();
    for (const row of schedules) {
      const existing = scheduleBySupplierId.get(row.supplier_id) ?? [];
      existing.push({
        day_of_week: row.day_of_week,
        is_closed: row.is_closed,
        opening_time: row.opening_time,
        closing_time: row.closing_time,
      });
      scheduleBySupplierId.set(row.supplier_id, existing);
    }

    return {
      items: rows.map((row) => this.mapSupplierListRow(row, scheduleBySupplierId.get(row.party_id) ?? [])),
      total,
    };
  }

  async getSupplier(supplierId: number): Promise<SupplierDetailViewModel> {
    return this.getSupplierByPartyId(supplierId, undefined);
  }

  async createSupplier(
    dto: CreateSupplierDto,
    createdByAccountId?: number
  ): Promise<SupplierDetailViewModel> {
    this.validateSupplierCreate(dto);
    const schedule = this.normalizeSupplierSchedule(dto.business_hours_schedule);

    const existingByCode = await this.partyRepository.findByCode(dto.supplier_code);
    if (existingByCode) {
      throw new ConflictError('Supplier code already exists');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      const partyTypeId = await this.requireLookupIdByCode(PARTY_TYPE_LOOKUP, 'supplier', client);
      const statusId = dto.status_id ?? (await this.requireLookupIdByCode(PARTY_STATUS_LOOKUP, 'active', client));

      await this.assertLookupType(statusId, PARTY_STATUS_LOOKUP, 'status_id', client);
      await this.assertLookupTypeIfProvided(dto.payment_terms_id, PAYMENT_TERMS_LOOKUP, 'payment_terms_id', client);
      await this.assertEmailsUnique(this.collectEmails(dto), undefined, client);

      const companyEntityTypeId = await this.getCompanyEntityTypeId(client);
      const rootContact = await this.contactRepository.create(
        companyEntityTypeId,
        dto.supplier_name,
        null,
        createdByAccountId ?? null,
        client
      );

      const created = await this.partyRepository.create(
        {
          contact_id: rootContact.contact_id,
          party_code: dto.supplier_code.trim(),
          party_name: dto.supplier_name.trim(),
          party_type_id: partyTypeId,
          status_id: statusId,
          description: dto.description ?? null,
          project_type_id: null,
          payment_terms_id: dto.payment_terms_id ?? null,
          business_hours: null,
        },
        createdByAccountId ?? null,
        'supplier_management',
        client
      );

      await this.partyRepository.replaceBusinessHoursForSupplier(
        created.party_id,
        schedule,
        createdByAccountId ?? null,
        'supplier_management',
        client
      );

      await this.syncAddresses(rootContact.contact_id, dto.addresses, createdByAccountId ?? null, client);
      await this.syncPhones(rootContact.contact_id, dto.phones, createdByAccountId ?? null, client);
      await this.syncEmails(rootContact.contact_id, dto.emails, createdByAccountId ?? null, client);
      await this.syncRelatedContacts(
        rootContact.contact_id,
        dto.contacts,
        [],
        createdByAccountId ?? null,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'party',
          entityId: created.party_id,
          operation: 'CREATE',
          changedBy: createdByAccountId ?? null,
          changes: {
            party_type: 'supplier',
            supplier_code: dto.supplier_code,
            supplier_name: dto.supplier_name,
            status_id: statusId,
            payment_terms_id: dto.payment_terms_id ?? null,
            business_hours_schedule: schedule,
          },
          transactionId,
          notes: 'Supplier created via Supplier Management',
          moduleName: 'supplier_management',
        },
        client
      );

      await client.query('COMMIT');
      return this.getSupplierByPartyId(created.party_id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateSupplier(
    supplierId: number,
    dto: UpdateSupplierDto,
    updatedByAccountId?: number
  ): Promise<SupplierDetailViewModel> {
    const existing = await this.getSupplierByPartyId(supplierId);
    const existingCode = existing.supplier_code;
    const schedule = this.normalizeSupplierSchedule(
      dto.business_hours_schedule ?? existing.business_hours_schedule
    );

    if (dto.supplier_name !== undefined && dto.supplier_name.trim().length === 0) {
      throw new ValidationError('Supplier name is required');
    }

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      if (dto.supplier_code && dto.supplier_code !== existingCode) {
        const duplicate = await this.partyRepository.findByCode(dto.supplier_code, client);
        if (duplicate && duplicate.party_id !== supplierId) {
          throw new ConflictError('Supplier code already exists');
        }
      }

      if (dto.status_id !== undefined) {
        await this.assertLookupType(dto.status_id, PARTY_STATUS_LOOKUP, 'status_id', client);
      }

      await this.assertLookupTypeIfProvided(dto.payment_terms_id, PAYMENT_TERMS_LOOKUP, 'payment_terms_id', client);

      const partyRow = await this.partyRepository.findById(supplierId, client);
      if (!partyRow) {
        throw new NotFoundError('Supplier not found');
      }

      await this.assertEmailsUnique(this.collectEmails(dto), partyRow.contact_id, client);

      await this.partyRepository.update(
        supplierId,
        {
          party_code: dto.supplier_code?.trim(),
          party_name: dto.supplier_name?.trim(),
          status_id: dto.status_id,
          description: dto.description,
          payment_terms_id: dto.payment_terms_id,
          business_hours: null,
          project_type_id: null,
        },
        updatedByAccountId ?? null,
        'supplier_management',
        client
      );

      await this.partyRepository.replaceBusinessHoursForSupplier(
        supplierId,
        schedule,
        updatedByAccountId ?? null,
        'supplier_management',
        client
      );

      if (dto.supplier_name !== undefined) {
        await this.contactRepository.update(
          partyRow.contact_id,
          { contact_name: dto.supplier_name.trim() },
          updatedByAccountId ?? null,
          client
        );
      }

      await this.syncAddresses(partyRow.contact_id, dto.addresses, updatedByAccountId ?? null, client);
      await this.syncPhones(partyRow.contact_id, dto.phones, updatedByAccountId ?? null, client);
      await this.syncEmails(partyRow.contact_id, dto.emails, updatedByAccountId ?? null, client);
      await this.syncRelatedContacts(
        partyRow.contact_id,
        dto.contacts,
        dto.deleted_contact_ids ?? [],
        updatedByAccountId ?? null,
        client
      );

      await this.auditLogRepository.create(
        {
          entityTable: 'party',
          entityId: supplierId,
          operation: 'UPDATE',
          changedBy: updatedByAccountId ?? null,
          changes: dto as unknown as Record<string, unknown>,
          transactionId,
          notes: 'Supplier updated via Supplier Management',
          moduleName: 'supplier_management',
        },
        client
      );

      await client.query('COMMIT');
      return this.getSupplierByPartyId(supplierId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteSupplier(supplierId: number, deletedByAccountId?: number): Promise<void> {
    const supplier = await this.getSupplierByPartyId(supplierId);

    const client = await pool.connect();
    const transactionId = randomUUID();

    try {
      await client.query('BEGIN');

      await this.partyRepository.softDelete(
        supplierId,
        deletedByAccountId ?? null,
        'supplier_management',
        client
      );

      await this.softDeleteContactTree(supplier.contact_id, deletedByAccountId ?? null, client);

      await this.auditLogRepository.create(
        {
          entityTable: 'party',
          entityId: supplierId,
          operation: 'DELETE',
          changedBy: deletedByAccountId ?? null,
          changes: {
            party_type: 'supplier',
            supplier_code: supplier.supplier_code,
            supplier_name: supplier.supplier_name,
          },
          transactionId,
          notes: 'Supplier soft deleted via Supplier Management',
          moduleName: 'supplier_management',
        },
        client
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private validateProjectCreate(dto: CreateProjectDto): void {
    if (!dto.project_code || dto.project_code.trim().length === 0) {
      throw new ValidationError('Project code is required');
    }
    if (!dto.project_name || dto.project_name.trim().length === 0) {
      throw new ValidationError('Project name is required');
    }
  }

  private validateSupplierCreate(dto: CreateSupplierDto): void {
    if (!dto.supplier_code || dto.supplier_code.trim().length === 0) {
      throw new ValidationError('Supplier code is required');
    }
    if (!dto.supplier_name || dto.supplier_name.trim().length === 0) {
      throw new ValidationError('Supplier name is required');
    }
    this.normalizeSupplierSchedule(dto.business_hours_schedule);
  }

  private async getProjectByPartyId(
    partyId: number,
    client?: PoolClient
  ): Promise<ProjectDetailViewModel> {
    const row = await this.partyRepository.findById(partyId, client);
    if (!row) {
      throw new NotFoundError('Project not found');
    }

    const projectTypeId = await this.requireLookupIdByCode(PARTY_TYPE_LOOKUP, 'project', client);
    if (row.party_type_id !== projectTypeId) {
      throw new NotFoundError('Project not found');
    }

    return this.mapProjectDetail(row, client);
  }

  private async getSupplierByPartyId(
    partyId: number,
    client?: PoolClient
  ): Promise<SupplierDetailViewModel> {
    const row = await this.partyRepository.findById(partyId, client);
    if (!row) {
      throw new NotFoundError('Supplier not found');
    }

    const supplierTypeId = await this.requireLookupIdByCode(PARTY_TYPE_LOOKUP, 'supplier', client);
    if (row.party_type_id !== supplierTypeId) {
      throw new NotFoundError('Supplier not found');
    }

    return this.mapSupplierDetail(row, client);
  }

  private async mapProjectDetail(
    row: PartyListRow,
    client?: PoolClient
  ): Promise<ProjectDetailViewModel> {
    const related = await this.buildContactGraph(row.contact_id, client);

    return {
      party_id: row.party_id,
      contact_id: row.contact_id,
      status_id: row.status_id,
      status_name: row.status_name,
      project_code: row.party_code,
      project_name: row.party_name,
      project_type_id: row.project_type_id,
      project_type_name: row.project_type_name,
      description: row.description,
      addresses: related.addresses,
      phones: related.phones,
      emails: related.emails,
      contacts: related.contacts,
      created_at: row.log_date_created,
      updated_at: row.log_date_updated,
    };
  }

  private async mapSupplierDetail(
    row: PartyListRow,
    client?: PoolClient
  ): Promise<SupplierDetailViewModel> {
    const related = await this.buildContactGraph(row.contact_id, client);
    const scheduleRows = await this.partyRepository.listBusinessHoursBySupplierIds([row.party_id], client);
    const schedule = this.normalizeSupplierSchedule(
      scheduleRows.map((item) => ({
        day_of_week: item.day_of_week,
        is_closed: item.is_closed,
        opening_time: item.opening_time,
        closing_time: item.closing_time,
      }))
    );

    return {
      party_id: row.party_id,
      contact_id: row.contact_id,
      status_id: row.status_id,
      status_name: row.status_name,
      supplier_code: row.party_code,
      supplier_name: row.party_name,
      payment_terms_id: row.payment_terms_id,
      payment_terms_name: row.payment_terms_name,
      business_hours_schedule: schedule,
      description: row.description,
      addresses: related.addresses,
      phones: related.phones,
      emails: related.emails,
      contacts: related.contacts,
      created_at: row.log_date_created,
      updated_at: row.log_date_updated,
    };
  }

  private mapProjectListRow(row: PartyListRow): ProjectListItemViewModel {
    return {
      party_id: row.party_id,
      party_code: row.party_code,
      party_name: row.party_name,
      status_id: row.status_id,
      status_name: row.status_name,
      project_code: row.party_code,
      project_name: row.party_name,
      project_type_id: row.project_type_id,
      project_type_name: row.project_type_name,
      created_at: row.log_date_created,
    };
  }

  private mapSupplierListRow(
    row: PartyListRow,
    businessHoursSchedule: SupplierBusinessHourViewModel[]
  ): SupplierListItemViewModel {
    return {
      party_id: row.party_id,
      party_code: row.party_code,
      party_name: row.party_name,
      status_id: row.status_id,
      status_name: row.status_name,
      supplier_code: row.party_code,
      supplier_name: row.party_name,
      payment_terms_id: row.payment_terms_id,
      payment_terms_name: row.payment_terms_name,
      business_hours_schedule: this.normalizeSupplierSchedule(businessHoursSchedule),
      created_at: row.log_date_created,
    };
  }

  private normalizeSupplierSchedule(
    schedule?: SupplierBusinessHourDto[]
  ): SupplierBusinessHourViewModel[] {
    const defaultSchedule = WEEK_DAYS.map((day): SupplierBusinessHourViewModel => ({
      day_of_week: day,
      is_closed: true,
      opening_time: null,
      closing_time: null,
    }));

    if (!schedule || schedule.length === 0) {
      return defaultSchedule;
    }

    const byDay = new Map<number, SupplierBusinessHourViewModel>();

    for (const item of schedule) {
      if (!Number.isInteger(item.day_of_week) || item.day_of_week < 1 || item.day_of_week > 7) {
        throw new ValidationError('Each schedule row must use day_of_week from 1 to 7');
      }

      if (byDay.has(item.day_of_week)) {
        throw new ValidationError('Each day can only appear once in business_hours_schedule');
      }

      const isClosed = !!item.is_closed;
      const openingTime = item.opening_time?.trim() || null;
      const closingTime = item.closing_time?.trim() || null;

      if (isClosed) {
        byDay.set(item.day_of_week, {
          day_of_week: item.day_of_week,
          is_closed: true,
          opening_time: null,
          closing_time: null,
        });
        continue;
      }

      if (!openingTime || !closingTime) {
        throw new ValidationError('Open days must have both opening_time and closing_time');
      }

      const openingMinutes = this.timeToMinutes(openingTime);
      const closingMinutes = this.timeToMinutes(closingTime);

      if (openingMinutes >= closingMinutes) {
        throw new ValidationError('opening_time must be earlier than closing_time for open days');
      }

      byDay.set(item.day_of_week, {
        day_of_week: item.day_of_week,
        is_closed: false,
        opening_time: this.normalizeTimeString(openingTime),
        closing_time: this.normalizeTimeString(closingTime),
      });
    }

    return WEEK_DAYS.map((day) => byDay.get(day) ?? {
      day_of_week: day,
      is_closed: true,
      opening_time: null,
      closing_time: null,
    });
  }

  private normalizeTimeString(value: string): string {
    const normalized = value.trim();
    if (/^\d{2}:\d{2}$/.test(normalized)) {
      return `${normalized}:00`;
    }
    if (/^\d{2}:\d{2}:\d{2}$/.test(normalized)) {
      return normalized;
    }
    throw new ValidationError('Time values must use HH:MM or HH:MM:SS format');
  }

  private timeToMinutes(value: string): number {
    const normalized = this.normalizeTimeString(value);
    const [hours, minutes] = normalized.split(':').map((part) => parseInt(part, 10));

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new ValidationError('Time values must be valid 24-hour times');
    }

    return (hours * 60) + minutes;
  }

  private async buildContactGraph(contactId: number, client?: PoolClient): Promise<{
    addresses: UserAddressViewModel[];
    phones: UserPhoneViewModel[];
    emails: UserEmailViewModel[];
    contacts: RelatedContactViewModel[];
  }> {
    const addresses = (await this.contactRepository.getAddressesByContact(contactId, client)).map(
      (item): UserAddressViewModel => ({
        address_id: item.address_id,
        address_type_id: item.address_type_id,
        address_type_name: item.address_type_name ?? null,
        address_label: item.address_label,
        house_no: item.house_no,
        street: item.street,
        barangay: item.barangay,
        city: item.city,
        province: item.province,
        region: item.region,
        country_code: item.country_code,
        postal_code: item.postal_code,
        is_primary: item.is_primary,
      })
    );

    const phones = (await this.contactRepository.getPhonesByContact(contactId, client)).map(
      (item): UserPhoneViewModel => ({
        phone_id: item.phone_id,
        phone_type_id: item.phone_type_id,
        phone_type_name: item.phone_type_name ?? null,
        phone_number: item.phone_number,
        is_primary: item.is_primary,
      })
    );

    const emails = (await this.contactRepository.getEmailsByContact(contactId, client)).map(
      (item): UserEmailViewModel => ({
        email_id: item.email_id,
        email_type_id: item.email_type_id,
        email_type_name: item.email_type_name ?? null,
        email_address: item.email_address,
        is_primary: item.is_primary,
      })
    );

    const contacts: RelatedContactViewModel[] = [];

    const children = await this.contactRepository.getChildrenByParentContact(contactId, client);
    for (const child of children) {
      contacts.push({
        contact_id: child.contact_id,
        prefix_id: child.prefix_id,
        first_name: child.first_name,
        middle_name: child.middle_name,
        last_name: child.last_name,
        suffix_id: child.suffix_id,
        contact_name: child.contact_name,
        entity_type_id: child.entity_type_id,
        addresses: (await this.contactRepository.getAddressesByContact(child.contact_id, client)).map(
          (item): UserAddressViewModel => ({
            address_id: item.address_id,
            address_type_id: item.address_type_id,
            address_type_name: item.address_type_name ?? null,
            address_label: item.address_label,
            house_no: item.house_no,
            street: item.street,
            barangay: item.barangay,
            city: item.city,
            province: item.province,
            region: item.region,
            country_code: item.country_code,
            postal_code: item.postal_code,
            is_primary: item.is_primary,
          })
        ),
        phones: (await this.contactRepository.getPhonesByContact(child.contact_id, client)).map(
          (item): UserPhoneViewModel => ({
            phone_id: item.phone_id,
            phone_type_id: item.phone_type_id,
            phone_type_name: item.phone_type_name ?? null,
            phone_number: item.phone_number,
            is_primary: item.is_primary,
          })
        ),
        emails: (await this.contactRepository.getEmailsByContact(child.contact_id, client)).map(
          (item): UserEmailViewModel => ({
            email_id: item.email_id,
            email_type_id: item.email_type_id,
            email_type_name: item.email_type_name ?? null,
            email_address: item.email_address,
            is_primary: item.is_primary,
          })
        ),
      });
    }

    return {
      addresses,
      phones,
      emails,
      contacts,
    };
  }

  private async syncAddresses(
    contactId: number,
    addresses: AddressDto[] | undefined,
    actorAccountId: number | null,
    client: PoolClient
  ): Promise<void> {
    if (!addresses) {
      return;
    }

    const existing = await this.contactRepository.getAddressesByContact(contactId, client);
    const existingById = new Map(existing.map((row) => [row.address_id, row]));
    const keepIds = new Set<number>();

    for (const address of addresses) {
      const label = this.buildAddressLabel(address);
      if (address.address_id && existingById.has(address.address_id)) {
        const updated = await this.contactRepository.updateAddress(
          address.address_id,
          {
            address_label: label,
            address_type_id: address.address_type_id ?? null,
            house_no: address.house_no ?? null,
            street: address.street ?? null,
            barangay: address.barangay ?? null,
            city: address.city ?? null,
            province: address.province ?? null,
            region: address.region ?? null,
            postal_code: address.postal_code ?? null,
            is_primary: address.is_primary ?? false,
          },
          actorAccountId,
          client
        );
        keepIds.add(updated.address_id);
      } else {
        const created = await this.contactRepository.createAddress(
          contactId,
          label,
          address.address_type_id ?? null,
          address.house_no ?? null,
          address.street ?? null,
          address.barangay ?? null,
          address.city ?? null,
          address.province ?? null,
          address.region ?? null,
          address.postal_code ?? null,
          address.is_primary ?? false,
          actorAccountId,
          client
        );
        keepIds.add(created.address_id);
      }
    }

    for (const row of existing) {
      if (!keepIds.has(row.address_id)) {
        await this.contactRepository.deleteAddress(row.address_id, actorAccountId, client);
      }
    }
  }

  private async syncPhones(
    contactId: number,
    phones: PhoneDto[] | undefined,
    actorAccountId: number | null,
    client: PoolClient
  ): Promise<void> {
    if (!phones) {
      return;
    }

    const existing = await this.contactRepository.getPhonesByContact(contactId, client);
    const existingById = new Map(existing.map((row) => [row.phone_id, row]));
    const keepIds = new Set<number>();

    for (const phone of phones) {
      if (phone.phone_id && existingById.has(phone.phone_id)) {
        const updated = await this.contactRepository.updatePhone(
          phone.phone_id,
          {
            phone_number: phone.phone_number,
            phone_type_id: phone.phone_type_id ?? null,
            is_primary: phone.is_primary ?? false,
          },
          actorAccountId,
          client
        );
        keepIds.add(updated.phone_id);
      } else {
        const created = await this.contactRepository.createPhone(
          contactId,
          phone.phone_number,
          phone.phone_type_id ?? null,
          phone.is_primary ?? false,
          actorAccountId,
          client
        );
        keepIds.add(created.phone_id);
      }
    }

    for (const row of existing) {
      if (!keepIds.has(row.phone_id)) {
        await this.contactRepository.deletePhone(row.phone_id, actorAccountId, client);
      }
    }
  }

  private async syncEmails(
    contactId: number,
    emails: EmailDto[] | undefined,
    actorAccountId: number | null,
    client: PoolClient
  ): Promise<void> {
    if (!emails) {
      return;
    }

    const existing = await this.contactRepository.getEmailsByContact(contactId, client);
    const existingById = new Map(existing.map((row) => [row.email_id, row]));
    const keepIds = new Set<number>();

    for (const email of emails) {
      if (email.email_id && existingById.has(email.email_id)) {
        const updated = await this.contactRepository.updateEmail(
          email.email_id,
          {
            email_address: email.email_address,
            email_type_id: email.email_type_id ?? null,
            is_primary: email.is_primary ?? false,
          },
          actorAccountId,
          client
        );
        keepIds.add(updated.email_id);
      } else {
        const created = await this.contactRepository.createEmail(
          contactId,
          email.email_address,
          email.email_type_id ?? null,
          email.is_primary ?? false,
          actorAccountId,
          client
        );
        keepIds.add(created.email_id);
      }
    }

    for (const row of existing) {
      if (!keepIds.has(row.email_id)) {
        await this.contactRepository.deleteEmail(row.email_id, actorAccountId, client);
      }
    }
  }

  private async syncRelatedContacts(
    parentContactId: number,
    contacts: ContactDto[] | undefined,
    deletedContactIds: number[],
    actorAccountId: number | null,
    client: PoolClient
  ): Promise<void> {
    if (!contacts && deletedContactIds.length === 0) {
      return;
    }

    const existingChildren = await this.contactRepository.getChildrenByParentContact(parentContactId, client);
    const existingById = new Map(existingChildren.map((contact) => [contact.contact_id, contact]));
    const keepIds = new Set<number>();

    const defaultEntityTypeId = await this.getPersonEntityTypeId(client);

    for (const contactInput of contacts || []) {
      let contactId: number;

      if (contactInput.contact_id && existingById.has(contactInput.contact_id)) {
        const updated = await this.contactRepository.update(
          contactInput.contact_id,
          {
            contact_name: contactInput.contact_name,
            prefix_id: contactInput.prefix_id ?? null,
            first_name: contactInput.first_name ?? null,
            middle_name: contactInput.middle_name ?? null,
            last_name: contactInput.last_name ?? null,
            suffix_id: contactInput.suffix_id ?? null,
          },
          actorAccountId,
          client
        );

        contactId = updated.contact_id;
      } else {
        const created = await this.contactRepository.create(
          contactInput.entity_type_id ?? defaultEntityTypeId,
          contactInput.contact_name,
          parentContactId,
          actorAccountId,
          client
        );

        if (
          contactInput.prefix_id !== undefined ||
          contactInput.first_name !== undefined ||
          contactInput.middle_name !== undefined ||
          contactInput.last_name !== undefined ||
          contactInput.suffix_id !== undefined
        ) {
          await this.contactRepository.update(
            created.contact_id,
            {
              prefix_id: contactInput.prefix_id ?? null,
              first_name: contactInput.first_name ?? null,
              middle_name: contactInput.middle_name ?? null,
              last_name: contactInput.last_name ?? null,
              suffix_id: contactInput.suffix_id ?? null,
            },
            actorAccountId,
            client
          );
        }

        contactId = created.contact_id;
      }

      keepIds.add(contactId);

      await this.syncAddresses(contactId, contactInput.addresses, actorAccountId, client);
      await this.syncPhones(contactId, contactInput.phones, actorAccountId, client);
      await this.syncEmails(contactId, contactInput.emails, actorAccountId, client);
    }

    for (const contactId of deletedContactIds) {
      if (existingById.has(contactId)) {
        await this.softDeleteContactTree(contactId, actorAccountId, client);
      }
    }

    if (contacts) {
      for (const existing of existingChildren) {
        if (!keepIds.has(existing.contact_id) && !deletedContactIds.includes(existing.contact_id)) {
          await this.softDeleteContactTree(existing.contact_id, actorAccountId, client);
        }
      }
    }
  }

  private async softDeleteContactTree(
    contactId: number,
    actorAccountId: number | null,
    client: PoolClient
  ): Promise<void> {
    const childContacts = await this.contactRepository.getChildrenByParentContact(contactId, client);

    for (const child of childContacts) {
      await this.softDeleteContactTree(child.contact_id, actorAccountId, client);
    }

    await this.contactRepository.deleteAddressesByContact(contactId, actorAccountId, client);
    await this.contactRepository.deletePhonesByContact(contactId, actorAccountId, client);
    await this.contactRepository.deleteEmailsByContact(contactId, actorAccountId, client);
    await this.contactRepository.softDelete(contactId, actorAccountId, client);
  }

  private buildAddressLabel(address: AddressDto): string {
    const line1 = [address.house_no, address.street]
      .map((part) => (part ?? '').trim())
      .filter((part) => part.length > 0)
      .join(' ');

    const line2 = [address.barangay, address.city, address.province]
      .map((part) => (part ?? '').trim())
      .filter((part) => part.length > 0)
      .join(', ');

    const line3 = [address.region, address.postal_code]
      .map((part) => (part ?? '').trim())
      .filter((part) => part.length > 0)
      .join(' ');

    return [line1, line2, line3]
      .filter((part) => part.length > 0)
      .join(', ');
  }

  private async assertLookupType(
    lookupId: number,
    expectedLookupType: string,
    fieldName: string,
    client?: PoolClient
  ): Promise<void> {
    const lookup = await this.lookupRepository.findById(lookupId);
    if (!lookup || lookup.look_up_type !== expectedLookupType) {
      throw new ValidationError(`${fieldName} must be a valid ${expectedLookupType} lookup value`);
    }
  }

  private async assertLookupTypeIfProvided(
    lookupId: number | null | undefined,
    expectedLookupType: string,
    fieldName: string,
    client?: PoolClient
  ): Promise<void> {
    if (lookupId === undefined || lookupId === null) {
      return;
    }

    await this.assertLookupType(lookupId, expectedLookupType, fieldName, client);
  }

  private async requireLookupIdByCode(
    lookupType: string,
    code: string,
    client?: PoolClient
  ): Promise<number> {
    const executor = client ?? pool;
    const result = await executor.query(
      `SELECT look_up_id
      FROM look_up
      WHERE look_up_type = $1
        AND code = $2
        AND is_deleted = false
      LIMIT 1`,
      [lookupType, code]
    );

    if (result.rows.length === 0) {
      throw new ValidationError(`Lookup value not found for ${lookupType}:${code}`);
    }

    return result.rows[0].look_up_id;
  }

  private collectEmails(input: {
    emails?: EmailDto[];
    contacts?: ContactDto[];
  }): string[] {
    const emails = new Set<string>();

    for (const email of input.emails || []) {
      const value = email.email_address?.trim().toLowerCase();
      if (value) {
        emails.add(value);
      }
    }

    for (const contact of input.contacts || []) {
      for (const email of contact.emails || []) {
        const value = email.email_address?.trim().toLowerCase();
        if (value) {
          emails.add(value);
        }
      }
    }

    return Array.from(emails);
  }

  private async assertEmailsUnique(
    emails: string[],
    rootContactId?: number,
    client?: PoolClient
  ): Promise<void> {
    if (emails.length === 0) {
      return;
    }

    const executor = client ?? pool;

    for (const email of emails) {
      let query = `
        SELECT 1
        FROM email e
        WHERE e.is_deleted = false
          AND LOWER(e.email_address) = LOWER($1)
      `;

      const params: any[] = [email];

      if (rootContactId !== undefined) {
        params.push(rootContactId);
        query += ` AND e.contact_id <> $2`;
      }

      query += ' LIMIT 1';

      const result = await executor.query(query, params);
      if (result.rows.length > 0) {
        throw new ConflictError(`Email already exists: ${email}`);
      }
    }
  }

  private async getPersonEntityTypeId(client?: PoolClient): Promise<number> {
    const executor = client ?? pool;
    const result = await executor.query(
      `SELECT look_up_id
      FROM look_up
      WHERE is_deleted = false
        AND (
          (look_up_type = 'ENTITY_TYPE' AND name = 'PERSON')
          OR (look_up_type = 'contact_entity_type' AND name = 'Person')
          OR (look_up_type = 'ENTITY_TYPE' AND name = 'Person')
          OR (look_up_type = 'contact_entity_type' AND name = 'PERSON')
        )
      ORDER BY
        CASE
          WHEN look_up_type = 'ENTITY_TYPE' AND name = 'PERSON' THEN 1
          WHEN look_up_type = 'contact_entity_type' AND name = 'Person' THEN 2
          WHEN look_up_type = 'ENTITY_TYPE' AND name = 'Person' THEN 3
          ELSE 4
        END,
        look_up_id ASC
      LIMIT 1`
    );

    if (result.rows.length === 0) {
      throw new ValidationError('Person contact entity type not found. Seed ENTITY_TYPE / PERSON first.');
    }

    return result.rows[0].look_up_id;
  }

  private async getCompanyEntityTypeId(client?: PoolClient): Promise<number> {
    const executor = client ?? pool;
    const result = await executor.query(
      `SELECT look_up_id
      FROM look_up
      WHERE is_deleted = false
        AND look_up_type = 'ENTITY_TYPE'
        AND name = 'COMPANY'
      LIMIT 1`
    );

    if (result.rows.length === 0) {
      throw new ValidationError('Company contact entity type not found. Seed ENTITY_TYPE / COMPANY first.');
    }

    return result.rows[0].look_up_id;
  }
}
