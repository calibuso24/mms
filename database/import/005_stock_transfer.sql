
BEGIN;

--DISABLE TRIGGER
SET session_replication_role to replica;

SELECT 'STOCK TRANSFER' AS table_name, COUNT(*) AS total_records FROM source.tbltransfer;

ALTER TABLE source.tbltransfer
ADD COLUMN IF NOT EXISTS stock_transfer_id BIGINT,
ADD COLUMN IF NOT EXISTS source_id BIGINT,
ADD COLUMN IF NOT EXISTS destination_id BIGINT
;

UPDATE source.tbltransfer a
SET stock_transfer_id = transferid
WHERE stock_transfer_id IS NULL
;


UPDATE source.tbltransfer a
SET source_id = b.party_id
FROM source.tblprojectsite b
WHERE a.fromprojid = b.projid
;

UPDATE source.tbltransfer a
SET destination_id = b.party_id
FROM source.tblprojectsite b
WHERE a.toprojid = b.projid
;

INSERT INTO stock_transfer
(
    stock_transfer_id,
    source_id,
    destination_id,
    transfer_date,
    stock_transfer_number,
    log_created_by_account_id,
    log_date_created,
    log_updated_by_account_id,
    log_date_updated,
    transfer_type_id
)       
SELECT
    s.stock_transfer_id,
    s.source_id,
    s.destination_id,
    s.datetransfer,
    s.docno,
    s.createdby,
    s.datecreated,
    s.modifiedby,
    s.datemodified,
    CASE WHEN p.type = 1 --Project
        THEN (select look_up_id FROM look_up where look_up_type = 'stock_transfer_type' and code = 'delivery_receipt') 
    WHEN p.type <> 1 --Not Project
        THEN (select look_up_id FROM look_up where look_up_type = 'stock_transfer_type' and code = 'rts_warehouse') 
    END AS transfer_type_id
FROM source.tbltransfer s
LEFT JOIN source.tblprojectsite p ON s.fromprojid = p.projid
;


ALTER TABLE source.tbltransfer_detail
ADD COLUMN IF NOT EXISTS stock_transfer_item_id BIGINT,
ADD COLUMN IF NOT EXISTS stock_transfer_id BIGINT,
ADD COLUMN IF NOT EXISTS material_id BIGINT,
ADD COLUMN IF NOT EXISTS material_brand_id BIGINT,
ADD COLUMN IF NOT EXISTS oum_id BIGINT
;

UPDATE source.tbltransfer_detail a
SET stock_transfer_item_id = transferdetailid
WHERE stock_transfer_item_id IS NULL
;

UPDATE source.tbltransfer_detail a
SET stock_transfer_id = transferid
WHERE stock_transfer_id IS NULL
;

UPDATE source.tbltransfer_detail a
SET material_id = b.material_id,
    material_brand_id = b.material_brand_id, 
    oum_id = b.unit
FROM source.tblproduct b
WHERE a.prodid = b.prodid
AND b.material_id IS NOT NULL
;

INSERT INTO stock_transfer_item
(
    stock_transfer_item_id,
    stock_transfer_id,
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
    d.stock_transfer_item_id,
    d.stock_transfer_id,
    d.material_id,
    d.material_brand_id,
    d.oum_id,
    d.quantity,
    d.quantity,
    d.createdby,
    d.datecreated,
    d.modifiedby,
    d.datemodified
FROM source.tbltransfer_detail d
WHERE d.stock_transfer_item_id IS NOT NULL
;

SELECT 
CASE WHEN 0 = (SELECT count(*) FROM stock_transfer) then setval('stock_transfer_id_seq', 1, false)
ELSE setval('stock_transfer_id_seq',(SELECT max(stock_transfer_id) FROM stock_transfer))
END
;

SELECT 
CASE WHEN 0 = (SELECT count(*) FROM stock_transfer_item) then setval('stock_transfer_item_id_seq', 1, false)
ELSE setval('stock_transfer_item_id_seq',(SELECT max(stock_transfer_item_id) FROM stock_transfer_item))
END
;

--ENABLE TRIGGER
SET session_replication_role to origin;

COMMIT;

