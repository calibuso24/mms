# MMS ERD

This document describes the MMS database entities and their fields, organized by module.

## 1. Core lookup and master data

### `look_up`
- `look_up_id` (PK)
- `look_up_type`
- `code`
- `name`
- `description`
- `display_order`
- `log_module_created`
- `log_module_updated`

### `category`
- `category_id` (PK)
- `name`
- `description`
- `status_id` → `look_up(look_up_id)`
- audit/log fields

### `sub_category`
- `sub_category_id` (PK)
- `category_id` → `category(category_id)`
- `name`
- `description`
- audit/log fields

### `brand`
- `brand_id` (PK)
- `name`
- `description`
- audit/log fields

### `unit_of_measure`
- `uom_id` (PK)
- `name`
- `abbreviation`
- `description`
- audit/log fields

### `material`
- `material_id` (PK)
- `name`
- `description`
- `category_id` → `category(category_id)`
- `sub_category_id` → `sub_category(sub_category_id)`
- `stock_uom_id` → `unit_of_measure(uom_id)`
- `status_id` → `look_up(look_up_id)`
- audit/log fields

### `material_specification`
- `material_specification_id` (PK)
- `material_id` → `material(material_id)`
- `specification`
- audit/log fields

### `material_brand`
- `material_brand_id` (PK)
- `material_id` → `material(material_id)`
- `brand_id` → `brand(brand_id)`
- `status_id` → `look_up(look_up_id)`
- audit/log fields

### `material_option`
- `material_option_id` (PK)
- `material_id` → `material(material_id)`
- `option_type_id` → `look_up(look_up_id)`
- `name`
- `description`
- audit/log fields

### `material_option_detail`
- `material_option_detail_id` (PK)
- `material_option_id` → `material_option(material_option_id)`
- `component_material_id` → `material(material_id)`
- `quantity`
- `uom_id` → `unit_of_measure(uom_id)`
- audit/log fields

## 2. Contact, party, and security

### `contact`
- `contact_id` (PK)
- `parent_contact_id` → `contact(contact_id)`
- `entity_type_id` → `look_up(look_up_id)`
- `name`
- `email`
- `phone`
- audit/log fields

### `address`
- `address_id` (PK)
- `contact_id` → `contact(contact_id)`
- `address_line1`
- `address_line2`
- `city`
- `state`
- `postal_code`
- `country`
- audit/log fields

### `phone`
- `phone_id` (PK)
- `contact_id` → `contact(contact_id)`
- `phone_number`
- `phone_type`
- audit/log fields

### `email`
- `email_id` (PK)
- `contact_id` → `contact(contact_id)`
- `email_address`
- `email_type`
- audit/log fields

### `party`
- `party_id` (PK)
- `contact_id` → `contact(contact_id)`
- `party_type_id` → `look_up(look_up_id)`
- `status_id` → `look_up(look_up_id)`
- `name`
- `description`
- audit/log fields

### `user`
- `user_id` (PK)
- `contact_id` → `contact(contact_id)`
- `username`
- `email`
- `password_hash`
- `status_id` → `look_up(look_up_id)`
- audit/log fields

### `role`
- `role_id` (PK)
- `name`
- `description`
- audit/log fields

### `permission`
- `permission_id` (PK)
- `name`
- `description`
- audit/log fields

### `role_permission`
- `role_permission_id` (PK)
- `role_id` → `role(role_id)`
- `permission_id` → `permission(permission_id)`
- audit/log fields

### `user_role`
- `user_role_id` (PK)
- `user_id` → `user(user_id)`
- `role_id` → `role(role_id)`
- audit/log fields

### `audit_log`
- `audit_log_id` (PK)
- `table_name`
- `record_id`
- `operation`
- `changed_by` → `user(user_id)`
- `changed_at`
- `changes`

## 3. Inventory

### `stock_movement`
- `stock_movement_id` (PK)
- `source_id` → `party(party_id)`
- `destination_id` → `party(party_id)`
- `material_id` → `material(material_id)`
- `material_brand_id` → `material_brand(material_brand_id)`
- `quantity`
- `uom_id` → `unit_of_measure(uom_id)`
- `movement_type_id` → `look_up(look_up_id)`
- `status_id` → `look_up(look_up_id)`
- `movement_date`
- `reference_code`
- `notes`
- audit/log fields

### `stock_balance`
- `stock_balance_id` (PK)
- `party_id` → `party(party_id)`
- `material_id` → `material(material_id)`
- `material_brand_id` → `material_brand(material_brand_id)`
- `quantity`
- `uom_id` → `unit_of_measure(uom_id)`
- `as_of_date`
- audit/log fields

### `stock_layer`
- `stock_layer_id` (PK)
- `party_id` → `party(party_id)`
- `material_id` → `material(material_id)`
- `material_brand_id` → `material_brand(material_brand_id)`
- `quantity`
- `uom_id` → `unit_of_measure(uom_id)`
- `source_movement_id` → `stock_movement(stock_movement_id)`
- `layer_date`
- audit/log fields

### `stock_transfer`
- `stock_transfer_id` (PK)
- `stock_transfer_number`
- `transfer_type_id` → `look_up(look_up_id)`
- `source_id` → `party(party_id)`
- `destination_id` → `party(party_id)`
- `project_id` → `party(party_id)`
- `purchase_order_id` → `purchase_order(purchase_order_id)`
- `delivery_advice_id` → `delivery_advice(delivery_advice_id)`
- `job_order_id` → `job_order(job_order_id)`
- `material_request_id` → `material_request(material_request_id)`
- `prepared_by_user_id` → `user(user_id)`
- `transfer_date`
- `status_id` → `look_up(look_up_id)`
- `reference_code`
- `notes`
- audit/log fields

### `stock_transfer_item`
- `stock_transfer_item_id` (PK)
- `stock_transfer_id` → `stock_transfer(stock_transfer_id)`
- `stock_movement_id` → `stock_movement(stock_movement_id)`
- `purchase_order_item_id` → `purchase_order_item(purchase_order_item_id)`
- `material_request_item_id` → `material_request_item(material_request_item_id)`
- `material_id` → `material(material_id)`
- `material_brand_id` → `material_brand(material_brand_id)`
- `uom_id` → `unit_of_measure(uom_id)`
- `quantity`
- `notes`
- audit/log fields

### `material_control`
- `material_control_id` (PK)
- `project_id` → `party(party_id)`
- `control_number`
- `status_id` → `look_up(look_up_id)`
- `approved_by` → `user(user_id)`
- `approved_at`
- `notes`
- audit/log fields

### `additional_control`
- `additional_control_id` (PK)
- `project_id` → `party(party_id)`
- `material_id` → `material(material_id)`
- `uom_id` → `unit_of_measure(uom_id)`
- `material_control_quantity`
- `additional_control_quantity`
- `served_control_quantity`
- `status_id` → `look_up(look_up_id)`
- `approved_by` → `user(user_id)`
- `approved_at`
- `notes`
- audit/log fields

## 4. Request and procurement

### `material_request`
- `material_request_id` (PK)
- `mr_number`
- `project_id` → `party(party_id)`
- `requested_by_user_id` → `user(user_id)`
- `requested_at`
- `date_prepared`
- `date_received`
- `status_id` → `look_up(look_up_id)`
- `stock_checked`
- `ceo_approval_required`
- `ceo_approved`
- `ceo_approved_by` → `user(user_id)`
- `ceo_approved_at`
- `notes`
- audit/log fields

### `material_request_item`
- `material_request_item_id` (PK)
- `material_request_id` → `material_request(material_request_id)`
- `material_id` → `material(material_id)`
- `requested_quantity`
- `approved_quantity`
- `estimated_quantity`
- `area_usage`
- `remarks`
- `uom_id` → `unit_of_measure(uom_id)`
- `notes`
- audit/log fields

### `purchase_order`
- `purchase_order_id` (PK)
- `po_number`
- `project_id` → `party(party_id)`
- `material_request_id` → `material_request(material_request_id)`
- `supplier_party_id` → `party(party_id)`
- `requested_by_user_id` → `user(user_id)`
- `prepared_at`
- `expected_delivery_date`
- `order_type_id` → `look_up(look_up_id)`
- `status_id` → `look_up(look_up_id)`
- `total_amount`
- `notes`
- audit/log fields

### `purchase_order_item`
- `purchase_order_item_id` (PK)
- `purchase_order_id` → `purchase_order(purchase_order_id)`
- `material_request_item_id` → `material_request_item(material_request_item_id)`
- `material_id` → `material(material_id)`
- `requested_quantity`
- `ordered_quantity`
- `received_quantity`
- `uom_id` → `unit_of_measure(uom_id)`
- `unit_price`
- `line_total`
- `notes`
- audit/log fields

### `purchase_order_adj`
- `purchase_order_adj_id` (PK)
- `purchase_order_id` → `purchase_order(purchase_order_id)`
- `adjustment_kind_id` → `look_up(look_up_id)`
- `adjustment_value`
- `notes`
- audit/log fields

### `purchase_order_item_adj`
- `purchase_order_item_adj_id` (PK)
- `purchase_order_item_id` → `purchase_order_item(purchase_order_item_id)`
- `adjustment_kind_id` → `look_up(look_up_id)`
- `adjustment_value`
- `notes`
- audit/log fields

## 5. Receipt and supplier logistics

### `delivery_receipt`
- `delivery_receipt_id` (PK)
- `dr_number`
- `project_id` → `party(party_id)`
- `material_request_id` → `material_request(material_request_id)`
- `purchase_order_id` → `purchase_order(purchase_order_id)`
- `prepared_by_user_id` → `user(user_id)`
- `delivered_at`
- `status_id` → `look_up(look_up_id)`
- `notes`
- audit/log fields

### `delivery_receipt_item`
- `delivery_receipt_item_id` (PK)
- `delivery_receipt_id` → `delivery_receipt(delivery_receipt_id)`
- `purchase_order_item_id` → `purchase_order_item(purchase_order_item_id)`
- `material_request_item_id` → `material_request_item(material_request_item_id)`
- `material_id` → `material(material_id)`
- `material_brand_id` → `material_brand(material_brand_id)`
- `uom_id` → `unit_of_measure(uom_id)`
- `quantity`
- `notes`
- audit/log fields

### `delivery_advice`
- `delivery_advice_id` (PK)
- `purchase_order_id` → `purchase_order(purchase_order_id)`
- `da_number`
- `reference_code`
- `issued_at`
- `received_at`
- `status_id` → `look_up(look_up_id)`
- `notes`
- audit/log fields

### `delivery_advice_item`
- `delivery_advice_item_id` (PK)
- `delivery_advice_id` → `delivery_advice(delivery_advice_id)`
- `purchase_order_item_id` → `purchase_order_item(purchase_order_item_id)`
- `material_id` → `material(material_id)`
- `material_brand_id` → `material_brand(material_brand_id)`
- `uom_id` → `unit_of_measure(uom_id)`
- `advised_quantity`
- `received_quantity`
- `notes`
- audit/log fields

## 6. Job order and service workflow

### `job_order`
- `job_order_id` (PK)
- `job_order_number`
- `service_type_id` → `look_up(look_up_id)`
- `requesting_party_id` → `party(party_id)`
- `service_provider_id` → `party(party_id)`
- `requested_by_user_id` → `user(user_id)`
- `prepared_by_user_id` → `user(user_id)`
- `requested_at`
- `expected_completion_at`
- `completed_at`
- `status_id` → `look_up(look_up_id)`
- `notes`
- audit/log fields

### `job_order_item`
- `job_order_item_id` (PK)
- `job_order_id` → `job_order(job_order_id)`
- `material_id` → `material(material_id)`
- `material_brand_id` → `material_brand(material_brand_id)`
- `uom_id` → `unit_of_measure(uom_id)`
- `quantity`
- `notes`
- audit/log fields

## 7. Audit and adjustment

### `physical_count`
- `physical_count_id` (PK)
- `physical_count_number`
- `project_id` → `party(party_id)`
- `counted_by_user_id` → `user(user_id)`
- `counted_at`
- `audit_period_start`
- `audit_period_end`
- `status_id` → `look_up(look_up_id)`
- `notes`
- audit/log fields

### `physical_count_item`
- `physical_count_item_id` (PK)
- `physical_count_id` → `physical_count(physical_count_id)`
- `material_id` → `material(material_id)`
- `material_brand_id` → `material_brand(material_brand_id)`
- `uom_id` → `unit_of_measure(uom_id)`
- `expected_quantity`
- `counted_quantity`
- `variance_quantity`
- `variance_reason`
- `notes`
- audit/log fields

### `material_adjustment`
- `material_adjustment_id` (PK)
- `material_adjustment_number`
- `project_id` → `party(party_id)`
- `requested_by_user_id` → `user(user_id)`
- `requested_at`
- `approved_by_user_id` → `user(user_id)`
- `approved_at`
- `status_id` → `look_up(look_up_id)`
- `adjustment_reason_id` → `look_up(look_up_id)`
- `notes`
- `stock_movement_id` → `stock_movement(stock_movement_id)`
- audit/log fields

### `material_adjustment_item`
- `material_adjustment_item_id` (PK)
- `material_adjustment_id` → `material_adjustment(material_adjustment_id)`
- `material_id` → `material(material_id)`
- `material_brand_id` → `material_brand(material_brand_id)`
- `uom_id` → `unit_of_measure(uom_id)`
- `system_quantity`
- `adjustment_quantity`
- `resulting_quantity`
- `notes`
- audit/log fields

## 8. Notes

- `material_brand_id` is included on inventory and procurement line-level tables to support brand-level traceability.
- `stock_transfer` is the inventory-side movement log for warehouse transfer, RTS, supplier return, job order delivery, and site receipt.
- `job_order` is a separate module that can link to inventory movement through `stock_transfer.job_order_id`.
- `physical_count` is a site audit module and does not automatically change inventory quantities.
- `material_adjustment` is an approval workflow that can post corrections through `stock_movement`.
