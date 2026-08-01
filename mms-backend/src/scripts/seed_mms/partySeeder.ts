import { SeedRunContext, PartySeedRecord } from './types.js';
import { formatSeedNumber, pushSummary, requireLookupId } from './helpers.js';

const PH_LOCATIONS = [
  { city: 'Quezon City', province: 'Metro Manila', region: 'NCR', postal: '1100' },
  { city: 'Taguig City', province: 'Metro Manila', region: 'NCR', postal: '1630' },
  { city: 'Makati City', province: 'Metro Manila', region: 'NCR', postal: '1227' },
  { city: 'Mandaluyong City', province: 'Metro Manila', region: 'NCR', postal: '1550' },
  { city: 'Antipolo', province: 'Rizal', region: 'Region IV-A', postal: '1870' },
  { city: 'Calamba', province: 'Laguna', region: 'Region IV-A', postal: '4027' },
  { city: 'Dasmarinas', province: 'Cavite', region: 'Region IV-A', postal: '4114' },
  { city: 'San Fernando', province: 'Pampanga', region: 'Region III', postal: '2000' },
  { city: 'Tarlac City', province: 'Tarlac', region: 'Region III', postal: '2300' },
  { city: 'Cebu City', province: 'Cebu', region: 'Region VII', postal: '6000' },
  { city: 'Iloilo City', province: 'Iloilo', region: 'Region VI', postal: '5000' },
  { city: 'Davao City', province: 'Davao del Sur', region: 'Region XI', postal: '8000' },
];

const PROJECT_PREFIXES = [
  'Skyline Residences',
  'Harbor Link Viaduct',
  'Metro Drainage Upgrade',
  'Northpoint Logistics Hub',
  'Riverside Floodwall',
  'Greenfield Township',
  'Civic Center Annex',
  'Industrial Park Expansion',
  'Airport Access Road',
  'Bulk Water Pipeline',
];

const SUPPLIER_NAMES = [
  'Luzon BuildSupply Corporation',
  'Visayas Prime Construction Trading',
  'Mindanao Steel and Aggregates Inc.',
  'Bayanihan Industrial Supply Co.',
  'Sierra Pacific Builders Depot',
  'Kaagapay Infrastructure Supplies',
  'Archipelago Mechanical and Electrical Supply',
  'Golden Trowel Materials Trading',
  'SolidNorth Civil Supply',
  'MetroSouth Engineering Merchants',
];

type PartyBuildResult = {
  projects: PartySeedRecord[];
  suppliers: PartySeedRecord[];
  warehouses: PartySeedRecord[];
};

export class PartySeeder {
  async seed(context: SeedRunContext): Promise<PartyBuildResult> {
    const entityTypeCompanyId = requireLookupId(context, 'ENTITY_TYPE', 'company');
    const partyTypeProjectId = requireLookupId(context, 'party_type', 'project');
    const partyTypeSupplierId = requireLookupId(context, 'party_type', 'supplier');
    const partyTypeWarehouseId = requireLookupId(context, 'party_type', 'warehouse');
    const partyStatusActiveId = requireLookupId(context, 'party_status', 'active');
    const projectTypeProjectId = requireLookupId(context, 'project_type', 'project');
    const projectTypeWarehouseId = requireLookupId(context, 'project_type', 'warehouse');
    const paymentTermsNet30Id = requireLookupId(context, 'payment_terms', 'net30');
    const paymentTermsNet60Id = requireLookupId(context, 'payment_terms', 'net60');

    const addressTypeOfficeId = requireLookupId(context, 'address_type', 'office');
    const addressTypeProjectSiteId = requireLookupId(context, 'address_type', 'project_site');
    const phoneTypeOfficeId = requireLookupId(context, 'PHONE_TYPE', 'office');
    const phoneTypeMobileId = requireLookupId(context, 'PHONE_TYPE', 'mobile');
    const emailTypeWorkId = requireLookupId(context, 'EMAIL_TYPE', 'work');

    let created = 0;
    let updated = 0;

    const projects: PartySeedRecord[] = [];
    const suppliers: PartySeedRecord[] = [];
    const warehouses: PartySeedRecord[] = [];

    const warehouseCount = Math.max(2, Math.ceil(context.config.counts.projects / 20));

    const createOrUpdateParty = async (params: {
      partyCode: string;
      partyName: string;
      partyTypeId: number;
      projectTypeId: number;
      paymentTermsId: number | null;
      businessHoursText: string | null;
      description: string;
      addressTypeId: number;
      phoneTypeId: number;
      locationSeedIndex: number;
      contactPersonName: string;
      contactEmail: string;
      contactPhone: string;
    }): Promise<PartySeedRecord> => {
      const existingPartyResult = await context.client.query<{
        party_id: number;
        contact_id: number;
      }>(
        `SELECT party_id, contact_id
         FROM party
         WHERE party_code = $1`,
        [params.partyCode]
      );

      let contactId: number;
      if (existingPartyResult.rowCount === 0) {
        const contactInsertResult = await context.client.query<{ contact_id: number }>(
          `INSERT INTO contact (
            entity_type_id,
            contact_name,
            is_deleted,
            log_date_created,
            log_created_by_account_id,
            log_module_created
          )
          VALUES ($1, $2, FALSE, NOW(), $3, 'seed_mms')
          RETURNING contact_id`,
          [entityTypeCompanyId, params.contactPersonName, context.actorAccountId]
        );

        contactId = contactInsertResult.rows[0].contact_id;
      } else {
        contactId = existingPartyResult.rows[0].contact_id;
        await context.client.query(
          `UPDATE contact
           SET contact_name = $2,
               is_deleted = FALSE,
               log_date_updated = NOW(),
               log_updated_by_account_id = $3,
               log_module_updated = 'seed_mms'
           WHERE contact_id = $1`,
          [contactId, params.contactPersonName, context.actorAccountId]
        );
      }

      const location = PH_LOCATIONS[params.locationSeedIndex % PH_LOCATIONS.length];
      const barangayNumber = (params.locationSeedIndex % 188) + 1;

      const partyResult = await context.client.query<{ party_id: number; inserted: boolean }>(
        `INSERT INTO party (
          contact_id,
          party_code,
          party_name,
          party_type_id,
          status_id,
          project_type_id,
          payment_terms_id,
          business_hours,
          description,
          is_deleted,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, NOW(), $10, 'seed_mms')
        ON CONFLICT (party_code)
        DO UPDATE SET
          contact_id = EXCLUDED.contact_id,
          party_name = EXCLUDED.party_name,
          party_type_id = EXCLUDED.party_type_id,
          status_id = EXCLUDED.status_id,
          project_type_id = EXCLUDED.project_type_id,
          payment_terms_id = EXCLUDED.payment_terms_id,
          business_hours = EXCLUDED.business_hours,
          description = EXCLUDED.description,
          is_deleted = FALSE,
          log_date_updated = NOW(),
          log_updated_by_account_id = EXCLUDED.log_created_by_account_id,
          log_module_updated = 'seed_mms'
        RETURNING party_id, (xmax = 0) AS inserted`,
        [
          contactId,
          params.partyCode,
          params.partyName,
          params.partyTypeId,
          partyStatusActiveId,
          params.projectTypeId,
          params.paymentTermsId,
          params.businessHoursText,
          params.description,
          context.actorAccountId,
        ]
      );

      if (partyResult.rows[0].inserted) {
        created += 1;
      } else {
        updated += 1;
      }

      await context.client.query(
        `UPDATE address
         SET is_deleted = TRUE,
             log_date_deleted = NOW(),
             log_deleted_by_account_id = $2
         WHERE contact_id = $1
           AND log_module_created = 'seed_mms'
           AND is_deleted = FALSE`,
        [contactId, context.actorAccountId]
      );

      await context.client.query(
        `INSERT INTO address (
          contact_id,
          address_type_id,
          address_label,
          house_no,
          street,
          barangay,
          city,
          province,
          region,
          country_code,
          postal_code,
          is_primary,
          is_verified,
          is_deleted,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          'PH',
          $10,
          TRUE,
          TRUE,
          FALSE,
          NOW(),
          $11,
          'seed_mms'
        )`,
        [
          contactId,
          params.addressTypeId,
          `${params.partyName}, ${location.city}, ${location.province}`,
          `${context.random.int(1, 180)}`,
          `${context.random.int(1, 12)}${['th', 'st', 'nd'][context.random.int(0, 2)]} Avenue`,
          `Barangay ${barangayNumber}`,
          location.city,
          location.province,
          location.region,
          location.postal,
          context.actorAccountId,
        ]
      );

      await context.client.query(
        `UPDATE phone
         SET is_deleted = TRUE,
             log_date_deleted = NOW(),
             log_deleted_by_account_id = $2
         WHERE contact_id = $1
           AND log_module_created = 'seed_mms'
           AND is_deleted = FALSE`,
        [contactId, context.actorAccountId]
      );

      await context.client.query(
        `INSERT INTO phone (
          contact_id,
          phone_type_id,
          phone_number,
          is_primary,
          is_deleted,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        )
        VALUES ($1, $2, $3, TRUE, FALSE, NOW(), $4, 'seed_mms'),
               ($1, $5, $6, FALSE, FALSE, NOW(), $4, 'seed_mms')`,
        [contactId, params.phoneTypeId, params.contactPhone, context.actorAccountId, phoneTypeMobileId, `09${context.random.int(10, 99)}${context.random.int(1000000, 9999999)}`]
      );

      await context.client.query(
        `UPDATE email
         SET is_deleted = TRUE,
             log_date_deleted = NOW(),
             log_deleted_by_account_id = $2
         WHERE contact_id = $1
           AND log_module_created = 'seed_mms'
           AND is_deleted = FALSE`,
        [contactId, context.actorAccountId]
      );

      await context.client.query(
        `INSERT INTO email (
          contact_id,
          email_type_id,
          email_address,
          is_primary,
          is_deleted,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        )
        VALUES ($1, $2, $3, TRUE, FALSE, NOW(), $4, 'seed_mms')`,
        [contactId, emailTypeWorkId, params.contactEmail, context.actorAccountId]
      );

      return {
        partyId: partyResult.rows[0].party_id,
        partyCode: params.partyCode,
        contactId,
        partyTypeCode: params.partyTypeId === partyTypeProjectId ? 'project' : params.partyTypeId === partyTypeSupplierId ? 'supplier' : 'warehouse',
      };
    };

    for (let i = 1; i <= context.config.counts.projects; i += 1) {
      const partyCode = formatSeedNumber('SEED-PRJ', i, 4);
      const name = `${context.random.pick(PROJECT_PREFIXES)} ${context.random.int(1, 8)}`;
      const managerCode = context.random.int(100, 999);

      const project = await createOrUpdateParty({
        partyCode,
        partyName: name,
        partyTypeId: partyTypeProjectId,
        projectTypeId: projectTypeProjectId,
        paymentTermsId: paymentTermsNet30Id,
        businessHoursText: 'Mon-Sat 07:00-18:00',
        description: `Large-scale construction project site ${managerCode} in the Philippines.`,
        addressTypeId: addressTypeProjectSiteId,
        phoneTypeId: phoneTypeOfficeId,
        locationSeedIndex: i,
        contactPersonName: `Project Office ${name}`,
        contactEmail: `project${i}@seed-mms.ph`,
        contactPhone: `+63 2 ${context.random.int(7000, 8999)} ${context.random.int(1000, 9999)}`,
      });

      projects.push(project);
    }

    for (let i = 1; i <= context.config.counts.suppliers; i += 1) {
      const partyCode = formatSeedNumber('SEED-SUP', i, 4);
      const supplierName = `${context.random.pick(SUPPLIER_NAMES)} ${context.random.int(1, 5)}`;
      const contactName = `Sales Desk ${supplierName}`;

      const supplier = await createOrUpdateParty({
        partyCode,
        partyName: supplierName,
        partyTypeId: partyTypeSupplierId,
        projectTypeId: projectTypeProjectId,
        paymentTermsId: context.random.bool(0.65) ? paymentTermsNet30Id : paymentTermsNet60Id,
        businessHoursText: 'Mon-Fri 08:00-17:00; Sat 08:00-12:00',
        description: 'Philippine supplier of construction and engineering materials.',
        addressTypeId: addressTypeOfficeId,
        phoneTypeId: phoneTypeOfficeId,
        locationSeedIndex: i + 100,
        contactPersonName: contactName,
        contactEmail: `supplier${i}@seed-mms.ph`,
        contactPhone: `+63 2 ${context.random.int(7100, 8999)} ${context.random.int(1000, 9999)}`,
      });

      suppliers.push(supplier);

      await context.client.query(
        `UPDATE supplier_business_hours
         SET is_deleted = TRUE,
             log_date_deleted = NOW(),
             log_deleted_by_account_id = $2
         WHERE supplier_id = $1
           AND log_module_created = 'seed_mms'
           AND is_deleted = FALSE`,
        [supplier.partyId, context.actorAccountId]
      );

      for (let day = 1; day <= 7; day += 1) {
        const isClosed = day === 7;
        await context.client.query(
          `INSERT INTO supplier_business_hours (
            supplier_id,
            day_of_week,
            opening_time,
            closing_time,
            is_closed,
            is_deleted,
            log_date_created,
            log_created_by_account_id,
            log_module_created
          )
          VALUES ($1, $2, $3, $4, $5, FALSE, NOW(), $6, 'seed_mms')
          ON CONFLICT (supplier_id, day_of_week)
          WHERE is_deleted = FALSE
          DO UPDATE SET
            opening_time = EXCLUDED.opening_time,
            closing_time = EXCLUDED.closing_time,
            is_closed = EXCLUDED.is_closed,
            is_deleted = FALSE,
            log_date_updated = NOW(),
            log_updated_by_account_id = EXCLUDED.log_created_by_account_id,
            log_module_updated = 'seed_mms'`,
          [supplier.partyId, day, isClosed ? null : '08:00', isClosed ? null : '17:00', isClosed, context.actorAccountId]
        );
      }
    }

    for (let i = 1; i <= warehouseCount; i += 1) {
      const warehouse = await createOrUpdateParty({
        partyCode: formatSeedNumber('SEED-WHS', i, 3),
        partyName: `Seed Central Warehouse ${i}`,
        partyTypeId: partyTypeWarehouseId,
        projectTypeId: projectTypeWarehouseId,
        paymentTermsId: paymentTermsNet30Id,
        businessHoursText: 'Mon-Sat 06:00-19:00',
        description: 'Warehouse location used for stock transfer stress testing.',
        addressTypeId: addressTypeOfficeId,
        phoneTypeId: phoneTypeOfficeId,
        locationSeedIndex: i + 200,
        contactPersonName: `Warehouse Supervisor ${i}`,
        contactEmail: `warehouse${i}@seed-mms.ph`,
        contactPhone: `+63 2 ${context.random.int(7000, 8999)} ${context.random.int(1000, 9999)}`,
      });

      warehouses.push(warehouse);
    }

    pushSummary(context, {
      module: 'Project and Supplier Management',
      created,
      updated,
      reused: 0,
      notes: `Projects=${projects.length}, Suppliers=${suppliers.length}, Warehouses=${warehouses.length}`,
    });

    return { projects, suppliers, warehouses };
  }
}
