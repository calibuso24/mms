
BEGIN;

--DISABLE TRIGGER
SET session_replication_role to replica;

SELECT 'SUPPLIER DELIVERY' AS table_name, COUNT(*) AS total_records FROM source.tbldelivery;

ALTER TABLE source.tbldelivery
ADD COLUMN IF NOT EXISTS supplier_delivery_id BIGINT,
ADD COLUMN IF NOT EXISTS supplier_id BIGINT,
ADD COLUMN IF NOT EXISTS project_id BIGINT
;

UPDATE source.tbldelivery a
SET supplier_delivery_id = drid
WHERE supplier_delivery_id IS NULL
;

UPDATE source.tbldelivery a
SET supplier_id = b.party_id
FROM source.tblsupplier b
WHERE a.supplierid = b.supplierid
;

UPDATE source.tbldelivery a
SET project_id = b.party_id
FROM source.tblprojectsite b
WHERE a.projid = b.projid
;

INSERT INTO supplier_delivery
(
    supplier_delivery_id,
    supplier_id,
    project_id,
    delivery_date,
    supplier_delivery_number,
    reference_code,
    log_created_by_account_id,
    log_date_created,
    log_updated_by_account_id,
    log_date_updated,
    status_id
)       
SELECT
    s.supplier_delivery_id,
    s.supplier_id,
    s.project_id,
    s.datereceived,
    s.drno,
    s.invoiceno,
    s.createdby,
    s.datecreated,
    s.modifiedby,
    s.datemodified,
    (select look_up_id FROM look_up where look_up_type = 'supplier_delivery_status' and code = 'posted') as status_id
FROM source.tbldelivery s
;


ALTER TABLE source.tbldelivery_detail
ADD COLUMN IF NOT EXISTS supplier_delivery_item_id BIGINT,
ADD COLUMN IF NOT EXISTS supplier_delivery_id BIGINT,
ADD COLUMN IF NOT EXISTS material_id BIGINT,
ADD COLUMN IF NOT EXISTS material_brand_id BIGINT,
ADD COLUMN IF NOT EXISTS oum_id BIGINT
;

UPDATE source.tbldelivery_detail a
SET supplier_delivery_item_id = drdetailid
WHERE supplier_delivery_item_id IS NULL
;

UPDATE source.tbldelivery_detail a
SET supplier_delivery_id = drid
WHERE supplier_delivery_id IS NULL
;

UPDATE source.tbldelivery_detail a
SET material_id = b.material_id,
    material_brand_id = b.material_brand_id, 
    oum_id = b.unit
FROM source.tblproduct b
WHERE a.prodid = b.prodid
AND b.material_id IS NOT NULL
;

INSERT INTO supplier_delivery_item
(
    supplier_delivery_item_id,
    supplier_delivery_id,
    material_id,
    material_brand_id,
    uom_id,
    delivered_quantity,
    accepted_quantity,
    log_created_by_account_id,
    log_date_created,
    log_updated_by_account_id,
    log_date_updated
)SELECT
    d.supplier_delivery_item_id,
    d.supplier_delivery_id,
    d.material_id,
    d.material_brand_id,
    d.oum_id,
    d.quantity,
    d.quantity,
    d.createdby,
    d.datecreated,
    d.modifiedby,
    d.datemodified
FROM source.tbldelivery_detail d
WHERE d.supplier_delivery_item_id IS NOT NULL   
;

SELECT 
CASE WHEN 0 = (SELECT count(*) FROM supplier_delivery) then setval('supplier_delivery_id_seq', 1, false)
ELSE setval('supplier_delivery_id_seq',(SELECT max(supplier_delivery_id) FROM supplier_delivery))
END
;

SELECT 
CASE WHEN 0 = (SELECT count(*) FROM supplier_delivery_item) then setval('supplier_delivery_item_id_seq', 1, false)
ELSE setval('supplier_delivery_item_id_seq',(SELECT max(supplier_delivery_item_id) FROM supplier_delivery_item))
END
;

--ENABLE TRIGGER
SET session_replication_role to origin;

COMMIT;

