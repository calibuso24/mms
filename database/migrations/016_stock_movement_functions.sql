CREATE OR REPLACE FUNCTION stock_movement_consume(
    p_source_id BIGINT,
    p_destination_id BIGINT,
    p_material_id BIGINT,
    p_material_brand_id BIGINT DEFAULT NULL,
    p_uom_id BIGINT,
    p_quantity NUMERIC,
    p_movement_type_code TEXT,
    p_status_code TEXT DEFAULT 'completed',
    p_method TEXT DEFAULT 'fifo',
    p_reference_code TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_remaining NUMERIC := p_quantity;
    v_movement_type_id BIGINT;
    v_status_id BIGINT;
    v_layer RECORD;
    v_movement_id BIGINT;
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive';
    END IF;

    SELECT look_up_id
    INTO v_movement_type_id
    FROM look_up
    WHERE look_up_type = 'stock_movement_type'
      AND code = p_movement_type_code;

    SELECT look_up_id
    INTO v_status_id
    FROM look_up
    WHERE look_up_type = 'stock_movement_status'
      AND code = p_status_code;

    IF v_movement_type_id IS NULL THEN
        RAISE EXCEPTION 'Invalid movement type: %', p_movement_type_code;
    END IF;
    IF v_status_id IS NULL THEN
        RAISE EXCEPTION 'Invalid status: %', p_status_code;
    END IF;

    INSERT INTO stock_movement (
        source_id,
        destination_id,
        material_id,
        material_brand_id,
        quantity,
        uom_id,
        movement_type_id,
        status_id,
        movement_date,
        reference_code,
        notes,
        log_date_created
    ) VALUES (
        p_source_id,
        p_destination_id,
        p_material_id,
        p_material_brand_id,
        p_quantity,
        p_uom_id,
        v_movement_type_id,
        v_status_id,
        now(),
        p_reference_code,
        p_notes,
        now()
    ) RETURNING stock_movement_id INTO v_movement_id;

    FOR v_layer IN
        SELECT stock_layer_id, quantity_available
        FROM stock_layer
        WHERE party_id = p_source_id
          AND material_id = p_material_id
          AND (p_material_brand_id IS NULL OR material_brand_id = p_material_brand_id)
          AND uom_id = p_uom_id
          AND quantity_available > 0
          AND is_deleted = FALSE
        ORDER BY
            CASE WHEN p_method = 'fifo' THEN receive_date END ASC,
            CASE WHEN p_method = 'lifo' THEN receive_date END DESC,
            stock_layer_id
        FOR UPDATE
    LOOP
        EXIT WHEN v_remaining <= 0;

        IF v_layer.quantity_available >= v_remaining THEN
            UPDATE stock_layer
            SET quantity_available = quantity_available - v_remaining,
                log_date_updated = now()
            WHERE stock_layer_id = v_layer.stock_layer_id;
            v_remaining := 0;
        ELSE
            UPDATE stock_layer
            SET quantity_available = 0,
                log_date_updated = now()
            WHERE stock_layer_id = v_layer.stock_layer_id;
            v_remaining := v_remaining - v_layer.quantity_available;
        END IF;
    END LOOP;

    IF v_remaining > 0 THEN
        RAISE EXCEPTION 'Insufficient stock for material % on party %', p_material_id, p_source_id;
    END IF;

    UPDATE stock_balance
    SET quantity_on_hand = quantity_on_hand - p_quantity,
        log_date_updated = now()
    WHERE party_id = p_source_id
      AND material_id = p_material_id
      AND (p_material_brand_id IS NULL OR material_brand_id = p_material_brand_id)
      AND uom_id = p_uom_id;

    INSERT INTO stock_balance (
        party_id,
        material_id,
        material_brand_id,
        quantity_on_hand,
        uom_id,
        log_date_created
    )
    SELECT p_destination_id, p_material_id, p_material_brand_id, p_quantity, p_uom_id, now()
    WHERE NOT EXISTS (
        SELECT 1
        FROM stock_balance
        WHERE party_id = p_destination_id
          AND material_id = p_material_id
          AND (p_material_brand_id IS NULL OR material_brand_id = p_material_brand_id)
          AND uom_id = p_uom_id
    );

    UPDATE stock_balance
    SET quantity_on_hand = quantity_on_hand + p_quantity,
        log_date_updated = now()
    WHERE party_id = p_destination_id
      AND material_id = p_material_id
      AND (p_material_brand_id IS NULL OR material_brand_id = p_material_brand_id)
      AND uom_id = p_uom_id;

    RETURN v_movement_id;
END;
$$;

CREATE OR REPLACE FUNCTION stock_movement_cancel(
    p_movement_id BIGINT,
    p_cancel_reason TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_original RECORD;
    v_reverse_id BIGINT;
    v_cancel_status_id BIGINT;
BEGIN
    SELECT sm.*, lu.look_up_id AS status_id
    INTO v_original
    FROM stock_movement sm
    JOIN look_up lu ON lu.look_up_type = 'stock_movement_status' AND lu.code = 'cancelled'
    WHERE sm.stock_movement_id = p_movement_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Stock movement % not found or invalid', p_movement_id;
    END IF;

    UPDATE stock_movement
    SET status_id = v_original.status_id,
        notes = COALESCE(notes || E'\n', '') || 'Cancelled: ' || COALESCE(p_cancel_reason, 'No reason provided'),
        log_date_updated = now()
    WHERE stock_movement_id = p_movement_id;

    INSERT INTO stock_movement (
        source_id,
        destination_id,
        material_id,
        material_brand_id,
        quantity,
        uom_id,
        movement_type_id,
        status_id,
        movement_date,
        reference_code,
        notes,
        log_date_created
    ) VALUES (
        v_original.destination_id,
        v_original.source_id,
        v_original.material_id,
        v_original.material_brand_id,
        v_original.quantity,
        v_original.uom_id,
        v_original.movement_type_id,
        v_original.status_id,
        now(),
        v_original.reference_code || '_REV',
        'Reversal of movement ' || p_movement_id || '. ' || COALESCE(p_cancel_reason, ''),
        now()
    ) RETURNING stock_movement_id INTO v_reverse_id;

    UPDATE stock_balance
    SET quantity_on_hand = quantity_on_hand + v_original.quantity,
        log_date_updated = now()
    WHERE party_id = v_original.source_id
      AND material_id = v_original.material_id
      AND (v_original.material_brand_id IS NULL OR material_brand_id = v_original.material_brand_id)
      AND uom_id = v_original.uom_id;

    UPDATE stock_balance
    SET quantity_on_hand = quantity_on_hand - v_original.quantity,
        log_date_updated = now()
    WHERE party_id = v_original.destination_id
      AND material_id = v_original.material_id
      AND (v_original.material_brand_id IS NULL OR material_brand_id = v_original.material_brand_id)
      AND uom_id = v_original.uom_id;

    RETURN v_reverse_id;
END;
$$;
