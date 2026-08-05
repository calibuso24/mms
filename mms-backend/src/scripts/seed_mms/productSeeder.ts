import { SeedRunContext, ProductSeedRecord } from './types.js';
import { formatSeedNumber, pushSummary, requireLookupId } from './helpers.js';

type CategorySeed = {
  code: string;
  name: string;
  description: string;
  subCategories: Array<{ code: string; name: string }>;
};

const CATEGORY_SEEDS: CategorySeed[] = [
  {
    code: 'SEED_CEM',
    name: 'Cement and Concrete',
    description: 'Construction cement and concrete materials.',
    subCategories: [
      { code: 'SEED_CEM_BAG', name: 'Cement Bags' },
      { code: 'SEED_AGG', name: 'Aggregates' },
    ],
  },
  {
    code: 'SEED_REB',
    name: 'Rebars and Structural Steel',
    description: 'Reinforcing bars and structural members.',
    subCategories: [
      { code: 'SEED_REB_DEFORMED', name: 'Deformed Bars' },
      { code: 'SEED_STEEL_SECTION', name: 'Steel Sections' },
    ],
  },
  {
    code: 'SEED_ELEC',
    name: 'Electrical Materials',
    description: 'Electrical consumables and conduit components.',
    subCategories: [
      { code: 'SEED_WIRE', name: 'Wires and Cables' },
      { code: 'SEED_CONDUIT', name: 'Conduits and Fittings' },
    ],
  },
  {
    code: 'SEED_PLMB',
    name: 'Plumbing Materials',
    description: 'Pipes, fittings, and sanitary accessories.',
    subCategories: [
      { code: 'SEED_PIPE', name: 'Pipes' },
      { code: 'SEED_FITT', name: 'Pipe Fittings' },
    ],
  },
  {
    code: 'SEED_FIN',
    name: 'Finishing Materials',
    description: 'Tiles, paint, gypsum and other finishing supplies.',
    subCategories: [
      { code: 'SEED_TILE', name: 'Tiles' },
      { code: 'SEED_PAINT', name: 'Paint and Coatings' },
    ],
  },
];

const UOM_SEEDS = [
  { name: 'Piece', abbreviation: 'pc' },
  { name: 'Bag', abbreviation: 'bag' },
  { name: 'Length', abbreviation: 'len' },
  { name: 'Roll', abbreviation: 'roll' },
  { name: 'Set', abbreviation: 'set' },
  { name: 'Kilo', abbreviation: 'kg' },
  { name: 'Cubic Meter', abbreviation: 'm3' },
  { name: 'Liter', abbreviation: 'L' },
];

const BRAND_SEEDS = [
  'Holcim',
  'Republic Cement',
  'SteelAsia',
  'Matimco',
  'Phelps Dodge',
  'Neltex',
  'Atlanta',
  'Boysen',
  'Davies',
  'Mariwasa',
  'Somany',
  'CitiHardware',
  'Wilcon',
];

const MATERIAL_TYPE_SEEDS = [
  { code: 'CONS', name: 'Consumable', description: 'Materials that are consumed during construction.' },
  { code: 'STRUC', name: 'Structural', description: 'Structural materials with engineering relevance.' },
  { code: 'ELEC', name: 'Electrical', description: 'Electrical materials and components.' },
  { code: 'PLMB', name: 'Plumbing', description: 'Plumbing system materials and accessories.' },
  { code: 'FIN', name: 'Finishing', description: 'Finishing and architectural materials.' },
];

const MATERIAL_NAME_TEMPLATES = [
  'Portland Cement Type 1',
  'Washed Sand',
  '3/4 Gravel',
  'Deformed Bar 10mm',
  'Deformed Bar 16mm',
  'Wide Flange Beam',
  'THHN Copper Wire 3.5mm2',
  'PVC Conduit 20mm',
  'uPVC Pipe 100mm',
  'PVC Elbow 90deg',
  'Ceramic Floor Tile 60x60',
  'Acrylic Latex Paint',
  'Waterproofing Compound',
  'Gypsum Board 9mm',
  'Tile Adhesive 25kg',
];

export class ProductSeeder {
  async seed(context: SeedRunContext): Promise<ProductSeedRecord[]> {
    const materialStatusId = requireLookupId(context, 'material_status', 'active');
    const materialBrandStatusId = requireLookupId(context, 'material_brand_status', 'active');

    let created = 0;
    let updated = 0;
    let reused = 0;

    const categoryMap = new Map<string, number>();
    const subCategoryMap = new Map<string, { subCategoryId: number; categoryId: number }>();

    for (const category of CATEGORY_SEEDS) {
      const categoryResult = await context.client.query<{ category_id: number }>(
        `INSERT INTO category (
          category_code,
          category_name,
          description,
          is_active,
          is_deleted,
          log_date_created,
          log_module_created
        )
        VALUES ($1, $2, $3, TRUE, FALSE, NOW(), 'seed_mms')
        ON CONFLICT (category_code)
        DO UPDATE SET
          category_name = EXCLUDED.category_name,
          description = EXCLUDED.description,
          is_active = TRUE,
          is_deleted = FALSE,
          log_date_updated = NOW(),
          log_module_updated = 'seed_mms'
        RETURNING category_id`,
        [category.code, category.name, category.description]
      );

      categoryMap.set(category.code, categoryResult.rows[0].category_id);

      for (const subCategory of category.subCategories) {
        const subCategoryResult = await context.client.query<{ sub_category_id: number }>(
          `INSERT INTO sub_category (
            category_id,
            sub_category_code,
            sub_category_name,
            is_active,
            is_deleted,
            log_date_created,
            log_module_created
          )
          VALUES ($1, $2, $3, TRUE, FALSE, NOW(), 'seed_mms')
          ON CONFLICT (category_id, sub_category_code)
          DO UPDATE SET
            sub_category_name = EXCLUDED.sub_category_name,
            is_active = TRUE,
            is_deleted = FALSE,
            log_date_updated = NOW(),
            log_module_updated = 'seed_mms'
          RETURNING sub_category_id`,
          [categoryResult.rows[0].category_id, subCategory.code, subCategory.name]
        );

        subCategoryMap.set(subCategory.code, {
          subCategoryId: subCategoryResult.rows[0].sub_category_id,
          categoryId: categoryResult.rows[0].category_id,
        });
      }
    }

    const uomMap = new Map<string, number>();
    for (const uom of UOM_SEEDS) {
      const uomResult = await context.client.query<{ uom_id: number }>(
        `INSERT INTO unit_of_measure (
          uom_name,
          abbreviation,
          is_active,
          is_deleted,
          log_date_created,
          log_module_created
        )
        VALUES ($1, $2, TRUE, FALSE, NOW(), 'seed_mms')
        ON CONFLICT (uom_name)
        DO UPDATE SET
          abbreviation = EXCLUDED.abbreviation,
          is_active = TRUE,
          is_deleted = FALSE,
          log_date_updated = NOW(),
          log_module_updated = 'seed_mms'
        RETURNING uom_id`,
        [uom.name, uom.abbreviation]
      );

      uomMap.set(uom.name, uomResult.rows[0].uom_id);
    }

    const brandMap = new Map<string, number>();
    for (const brandName of BRAND_SEEDS) {
      const brandResult = await context.client.query<{ brand_id: number }>(
        `INSERT INTO brand (
          brand_name,
          is_active,
          is_deleted,
          log_date_created,
          log_module_created
        )
        VALUES ($1, TRUE, FALSE, NOW(), 'seed_mms')
        ON CONFLICT (brand_name)
        DO UPDATE SET
          is_active = TRUE,
          is_deleted = FALSE,
          log_date_updated = NOW(),
          log_module_updated = 'seed_mms'
        RETURNING brand_id`,
        [brandName]
      );

      brandMap.set(brandName, brandResult.rows[0].brand_id);
    }

    const materialTypeMap = new Map<string, number>();
    for (const materialType of MATERIAL_TYPE_SEEDS) {
      const materialTypeResult = await context.client.query<{ material_type_id: number }>(
        `INSERT INTO material_type (
          material_type_code,
          material_type_name,
          description,
          is_active,
          is_deleted,
          log_date_created,
          log_module_created
        )
        VALUES ($1, $2, $3, TRUE, FALSE, NOW(), 'seed_mms')
        ON CONFLICT (material_type_code)
        DO UPDATE SET
          material_type_name = EXCLUDED.material_type_name,
          description = EXCLUDED.description,
          is_active = TRUE,
          is_deleted = FALSE,
          log_date_updated = NOW(),
          log_module_updated = 'seed_mms'
        RETURNING material_type_id`,
        [materialType.code, materialType.name, materialType.description]
      );

      materialTypeMap.set(materialType.code, materialTypeResult.rows[0].material_type_id);
    }

    const subCategoryEntries = [...subCategoryMap.entries()];
    const uomNames = [...uomMap.keys()];
    const brandNames = [...brandMap.keys()];
    const materialTypeCodes = [...materialTypeMap.keys()];
    const seededMaterials: ProductSeedRecord[] = [];

    for (let i = 1; i <= context.config.counts.products; i += 1) {
      const code = formatSeedNumber('SEED-MAT', i, 5);
      const subCategory = context.random.pick(subCategoryEntries);
      const materialNameBase = context.random.pick(MATERIAL_NAME_TEMPLATES);
      const uomName = context.random.pick(uomNames);
      const materialTypeCode = context.random.pick(materialTypeCodes);
      const brandName = context.random.bool(0.72) ? context.random.pick(brandNames) : null;

      const sourceDescription = `${materialNameBase} - Lot ${context.random.int(100, 999)} (${uomName})`;
      const notes = context.random.bool(0.25)
        ? 'For high-rise and infrastructure works in NCR, CALABARZON, and Central Luzon.'
        : null;

      const categoryId = subCategory[1].categoryId;
      const subCategoryId = subCategory[1].subCategoryId;
      const uomId = uomMap.get(uomName);
      const materialTypeId = materialTypeMap.get(materialTypeCode);

      if (!categoryId || !uomId || !materialTypeId) {
        throw new Error('Failed to resolve product seed foreign keys.');
      }

      const materialResult = await context.client.query<{
        material_id: number;
        inserted: boolean;
      }>(
        `INSERT INTO material (
          product_code,
          product_name,
          source_description,
          category_id,
          sub_category_id,
          stock_uom_id,
          status_id,
          material_type_id,
          notes,
          is_deleted,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, NOW(), $10, 'seed_mms')
        ON CONFLICT (product_code)
        DO UPDATE SET
          product_name = EXCLUDED.product_name,
          source_description = EXCLUDED.source_description,
          category_id = EXCLUDED.category_id,
          sub_category_id = EXCLUDED.sub_category_id,
          stock_uom_id = EXCLUDED.stock_uom_id,
          status_id = EXCLUDED.status_id,
          material_type_id = EXCLUDED.material_type_id,
          notes = EXCLUDED.notes,
          is_deleted = FALSE,
          log_date_updated = NOW(),
          log_updated_by_account_id = EXCLUDED.log_created_by_account_id,
          log_module_updated = 'seed_mms'
        RETURNING material_id, (xmax = 0) AS inserted`,
        [
          code,
          `${materialNameBase} ${context.random.int(1, 50)}`,
          sourceDescription,
          categoryId,
          subCategoryId,
          uomId,
          materialStatusId,
          materialTypeId,
          notes,
          context.actorAccountId,
        ]
      );

      const materialId = materialResult.rows[0].material_id;
      if (materialResult.rows[0].inserted) {
        created += 1;
      } else {
        updated += 1;
      }

      const specification = `Spec-${context.random.int(1000, 9999)}`;
      await context.client.query(
        `INSERT INTO material_specification (
          material_id,
          primary_size,
          secondary_size,
          thickness_or_gauge,
          length,
          standard,
          additional_specification,
          is_deleted,
          log_date_created,
          log_created_by_account_id,
          log_module_created
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NOW(), $8, 'seed_mms')
        ON CONFLICT (material_id)
        DO UPDATE SET
          primary_size = EXCLUDED.primary_size,
          secondary_size = EXCLUDED.secondary_size,
          thickness_or_gauge = EXCLUDED.thickness_or_gauge,
          length = EXCLUDED.length,
          standard = EXCLUDED.standard,
          additional_specification = EXCLUDED.additional_specification,
          is_deleted = FALSE,
          log_date_updated = NOW(),
          log_updated_by_account_id = EXCLUDED.log_created_by_account_id,
          log_module_updated = 'seed_mms'`,
        [
          materialId,
          `${context.random.int(10, 150)} mm`,
          context.random.bool(0.4) ? `${context.random.int(5, 80)} mm` : null,
          context.random.bool(0.3) ? `Gauge ${context.random.int(16, 26)}` : null,
          context.random.bool(0.6) ? `${context.random.int(1, 12)} m` : null,
          specification,
          'Philippine construction standard commercial grade',
          context.actorAccountId,
        ]
      );

      let materialBrandId: number | null = null;
      if (brandName) {
        const brandId = brandMap.get(brandName);
        if (!brandId) {
          throw new Error('Unable to resolve brand id for product seeding.');
        }

        const materialBrandResult = await context.client.query<{
          material_brand_id: number;
        }>(
          `INSERT INTO material_brand (
            material_id,
            brand_id,
            status_id,
            is_deleted,
            log_date_created,
            log_created_by_account_id,
            log_module_created
          )
          VALUES ($1, $2, $3, FALSE, NOW(), $4, 'seed_mms')
          ON CONFLICT (material_id, brand_id)
          DO UPDATE SET
            status_id = EXCLUDED.status_id,
            is_deleted = FALSE,
            log_date_updated = NOW(),
            log_updated_by_account_id = EXCLUDED.log_created_by_account_id,
            log_module_updated = 'seed_mms'
          RETURNING material_brand_id`,
          [
            materialId,
            brandId,
            materialBrandStatusId,
            context.actorAccountId,
          ]
        );

        materialBrandId = materialBrandResult.rows[0].material_brand_id;
      } else {
        reused += 1;
      }

      seededMaterials.push({
        materialId,
        materialCode: code,
        productName: materialNameBase,
        categoryId,
        subCategoryId,
        uomId,
        brandId: brandName ? brandMap.get(brandName) ?? null : null,
        materialBrandId,
      });
    }

    pushSummary(context, {
      module: 'Product Management',
      created,
      updated,
      reused,
      notes: `Seeded ${seededMaterials.length} materials with Philippine construction catalog patterns.`,
    });

    return seededMaterials;
  }
}
