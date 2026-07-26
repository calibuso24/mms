# MMS Workflow Reference

This document describes the workflow of MMS so other AI or reviewers can understand the complete process.

## Quick Flow Summary

1. Material request is created by the project/site.
2. If the material exists in warehouse stock, issue it via `delivery_receipt` and log it in `stock_transfer`.
3. If the material is not available internally, create a `purchase_order` and route through supplier delivery and receipt.
4. Job order materials are managed separately in `job_order`, with delivery logged through `stock_transfer`.
5. Quarterly site counts use `physical_count`, and approved corrections use `material_adjustment`.

## Overview

MMS is designed as a materials management system covering:
- project material requests
- purchasing and supplier logistics
- inventory movement and stock transfer
- job order service delivery
- inventory audit and adjustment
- material control and coordination

The workflow is driven by document modules and inventory logs.

## 1. Material request flow

### 1.1 Request creation
- A project/site raises a `material_request`.
- Items are added in `material_request_item`.
- The request captures requested quantity, approved quantity, and estimated quantity.

### 1.2 Decision path
- If material is available in the main office warehouse:
  - fulfill from internal stock
  - no purchase order is needed
  - create a `delivery_receipt` for warehouse issue
  - optionally create `stock_transfer` for inventory movement
- If material is not available internally:
  - create a `purchase_order`
  - link it to the `material_request` when possible

## 2. Purchasing and supplier logistics

### 2.1 Purchase order creation
- `purchase_order` records the PO header.
- `purchase_order_item` records line items.
- `order_type_id` distinguishes regular purchase, site purchase, or other PO types.

### 2.2 Supplier delivery
- `delivery_advice` and `delivery_advice_item` track supplier delivery advice.
- They support partial deliveries and supplier documents.

### 2.3 Receipt logging
- `delivery_receipt` and `delivery_receipt_item` record received goods.
- These documents can be used for both supplier receipts and internal warehouse deliveries.
- If the receipt is internal, `purchase_order_id` may remain `NULL`.

## 3. Inventory movement and stock transfer

### 3.1 Stock transfer module
- `stock_transfer` is the inventory log for material movement.
- It supports multiple transfer types, such as:
  - warehouse transfer
  - `RTS Warehouse`
  - `RTS Supplier`
  - `Job Order Delivery`
  - `Site Receipt`

### 3.2 Stock transfer line items
- `stock_transfer_item` stores brand-aware line items.
- It can link to:
  - `purchase_order_item`
  - `material_request_item`
  - `stock_movement`
  - `job_order`

### 3.3 Inventory state
- `stock_movement` stores detailed movement records.
- `stock_balance` tracks current stock position.
- `stock_layer` tracks costing or layer-level inventory detail.

## 4. Job order and service workflow

### 4.1 Job order document
- `job_order` is a separate service module.
- It tracks internal or external service jobs.
- `job_order_item` lists materials to send to the service shop.

### 4.2 Job order delivery
- Job material movement is logged in `stock_transfer`.
- `stock_transfer.job_order_id` links the inventory movement to the job order.
- This keeps the service document separate from inventory flow.

## 5. Inventory audit and correction

### 5.1 Physical count
- `physical_count` supports quarterly site inventory audits.
- `physical_count_item` records expected quantity, counted quantity, and variance.
- This is an audit document and does not automatically adjust stock.

### 5.2 Material adjustment
- `material_adjustment` supports approved stock corrections.
- `material_adjustment_item` captures the quantities before and after.
- Approved adjustments may post a `stock_movement` of type `adjustment`.

## 6. Control and aggregation

### 6.1 Material control
- `material_control` is used for project/site material control tracking.
- It helps coordinate material availability and approvals.

### 6.2 Additional control
- `additional_control` aggregates material totals per project/material/UOM.
- It tracks material control quantity, additional control quantity, and served quantity.

## 7. Summary of the main flows

### 7.1 Internal warehouse fulfillment
1. `material_request` created
2. warehouse checks stock
3. `delivery_receipt` created for site issue
4. `stock_transfer` logs the movement

### 7.2 Supplier purchase flow
1. `material_request` created
2. `purchase_order` created
3. supplier issues `delivery_advice`
4. site/warehouse receives goods with `delivery_receipt`
5. `stock_transfer` logs inventory movement

### 7.3 Job order service flow
1. `job_order` created
2. `job_order_item` records materials
3. `stock_transfer` logs the delivery to service

### 7.4 Inventory audit and correction
1. `physical_count` captures actual inventory counts
2. variances are computed in `physical_count_item`
3. approved `material_adjustment` corrects stock
4. `stock_movement` records the adjustment

## 8. Best-practice notes
- Always preserve links between request, PO, and transfer documents.
- Use `material_brand_id` consistently for brand-level traceability.
- Keep `delivery_receipt` flexible for both supplier and warehouse issued materials.
- Use `stock_transfer` as the inventory-side log of actual movement.
- Keep `job_order` separate from inventory flow, but link it through `stock_transfer`.

## 9. Reference file notes
- Use this file as a canonical workflow reference for MMS.
- Combine this flow file with `docs/ERD.md` and `docs/ERD_diagram.md` for schema and diagram context.
