/**
 * Cogniviti Bridge — Coupa Schema Packs & Templates Seed
 *
 * Populates Coupa API field definitions derived from the official
 * Coupa OpenAPI specification (v44).  Creates schema packs for
 * each of the 10 supported Coupa interfaces and wires them into
 * template definitions (Coupa as source + Coupa as target).
 *
 * Interfaces covered:
 *  1. Invoices  (InvoiceHeader + InvoiceLine)
 *  2. Requisitions  (RequisitionHeader + RequisitionLine)
 *  3. Purchase Orders  (OrderHeader + OrderLine)
 *  4. Supplier Information
 *  5. Suppliers
 *  6. Lookups
 *  7. Lookup Values
 *  8. Receiving Transactions
 *  9. Inventory Transactions
 * 10. Approvals
 */

import { PrismaClient } from '@prisma/client';

type SchemaFieldCreate = {
  path: string;
  dataType: string;
  required: boolean;
  description?: string;
  example?: string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// COUPA INVOICE FIELDS  (from InvoiceHeader + InvoiceLine definitions)
// ═══════════════════════════════════════════════════════════════════════════════
const coupaInvoiceFields: SchemaFieldCreate[] = [
  // ── Header-level ──
  { path: 'id', dataType: 'Integer', required: false, description: 'Coupa unique identifier (read-only)' },
  { path: 'invoice-number', dataType: 'String', required: true, description: 'Invoice number (max 40 chars)' },
  { path: 'invoice-date', dataType: 'DateTime', required: true, description: 'Date of invoice (ISO 8601)' },
  { path: 'status', dataType: 'String', required: false, description: 'Invoice status', example: 'approved' },
  { path: 'currency.code', dataType: 'String', required: false, description: 'Currency code', example: 'USD' },
  { path: 'supplier.id', dataType: 'Integer', required: false, description: 'Coupa supplier ID' },
  { path: 'supplier.name', dataType: 'String', required: false, description: 'Supplier name' },
  { path: 'supplier.number', dataType: 'String', required: true, description: 'Supplier number' },
  { path: 'account-type.id', dataType: 'Integer', required: false, description: 'Account type reference' },
  { path: 'bill-to-address.id', dataType: 'Integer', required: false, description: 'Bill-to address reference' },
  { path: 'remit-to-address.id', dataType: 'Integer', required: false, description: 'Remit-to address reference' },
  { path: 'invoice-from-address.id', dataType: 'Integer', required: false, description: 'Invoice-from address reference' },
  { path: 'ship-from-address.id', dataType: 'Integer', required: false, description: 'Ship-from address reference' },
  { path: 'supplier-remit-to.id', dataType: 'Integer', required: false, description: 'Supplier remit-to address' },
  { path: 'payment-term.id', dataType: 'Integer', required: false, description: 'Payment term reference' },
  { path: 'payment-term.code', dataType: 'String', required: false, description: 'Payment term code' },
  { path: 'shipping-term.id', dataType: 'Integer', required: false, description: 'Shipping term reference' },
  { path: 'contract.id', dataType: 'Integer', required: false, description: 'Contract reference' },
  { path: 'line-level-taxation', dataType: 'Boolean', required: false, description: 'Whether taxes are at line level' },
  { path: 'gross-total', dataType: 'Decimal', required: false, description: 'Gross total (read-only)' },
  { path: 'total-with-taxes', dataType: 'Decimal', required: false, description: 'Total including taxes (read-only)' },
  { path: 'tax-amount', dataType: 'Decimal', required: false, description: 'Header-level tax amount' },
  { path: 'tax-rate', dataType: 'Decimal', required: false, description: 'Header-level tax rate' },
  { path: 'tax-code', dataType: 'String', required: false, description: 'Header-level tax code reference' },
  { path: 'shipping-amount', dataType: 'Decimal', required: false, description: 'Shipping amount' },
  { path: 'handling-amount', dataType: 'Decimal', required: false, description: 'Handling amount' },
  { path: 'misc-amount', dataType: 'Decimal', required: false, description: 'Miscellaneous amount' },
  { path: 'discount-amount', dataType: 'Decimal', required: false, description: 'Discount amount' },
  { path: 'discount-percent', dataType: 'Decimal', required: false, description: 'Discount percentage' },
  { path: 'exchange-rate', dataType: 'Decimal', required: false, description: 'Exchange rate' },
  { path: 'payment-channel', dataType: 'String', required: false, description: 'Payment channel (ERP, CoupaPay)', example: 'erp' },
  { path: 'payment-date', dataType: 'DateTime', required: false, description: 'Payment date' },
  { path: 'payment-notes', dataType: 'String', required: false, description: 'Payment notes' },
  { path: 'delivery-date', dataType: 'DateTime', required: false, description: 'Date of supply/delivery' },
  { path: 'delivery-number', dataType: 'String', required: false, description: 'Delivery number' },
  { path: 'comments', dataType: 'String', required: false, description: 'Invoice comments' },
  { path: 'internal-note', dataType: 'String', required: false, description: 'Internal note' },
  { path: 'supplier-note', dataType: 'String', required: false, description: 'Supplier-provided note' },
  { path: 'is-credit-note', dataType: 'Boolean', required: false, description: 'Document type is credit note' },
  { path: 'document-type', dataType: 'String', required: true, description: 'Invoice or Credit Note (read-only)' },
  { path: 'buyer-tax-registration.id', dataType: 'Integer', required: false, description: 'Buyer tax registration' },
  { path: 'supplier-tax-registration.id', dataType: 'Integer', required: false, description: 'Supplier tax registration' },
  { path: 'origin-currency.code', dataType: 'String', required: false, description: 'Local/origin currency code' },
  { path: 'origin-currency-gross', dataType: 'Decimal', required: false, description: 'Local currency gross amount' },
  { path: 'origin-currency-net', dataType: 'Decimal', required: false, description: 'Local currency net amount' },
  { path: 'taxes-in-origin-country-currency', dataType: 'Decimal', required: false, description: 'Local currency tax amount' },
  { path: 'original-invoice-number', dataType: 'String', required: false, description: 'Original invoice number (for credit notes)' },
  { path: 'original-invoice-date', dataType: 'DateTime', required: false, description: 'Original invoice date (for credit notes)' },
  { path: 'exported', dataType: 'Boolean', required: true, description: 'Whether transaction has been exported (read-only)' },
  { path: 'last-exported-at', dataType: 'DateTime', required: false, description: 'Last exported timestamp' },
  { path: 'paid', dataType: 'Boolean', required: false, description: 'Whether invoice is paid' },
  { path: 'folio-number', dataType: 'String', required: false, description: 'Folio number' },
  { path: 'series', dataType: 'String', required: false, description: 'Invoice series (max 30)' },
  { path: 'requested-by.id', dataType: 'Integer', required: false, description: 'Requester user reference' },
  { path: 'ship-to-address.id', dataType: 'Integer', required: false, description: 'Ship-to address reference' },
  { path: 'created-at', dataType: 'DateTime', required: false, description: 'Record creation timestamp (read-only)' },
  { path: 'updated-at', dataType: 'DateTime', required: false, description: 'Record update timestamp (read-only)' },

  // ── Invoice Line-level ──
  { path: 'invoice-lines[*].id', dataType: 'Integer', required: false, description: 'Line item Coupa ID' },
  { path: 'invoice-lines[*].line-num', dataType: 'Integer', required: true, description: 'Line number' },
  { path: 'invoice-lines[*].description', dataType: 'String', required: true, description: 'Line item description' },
  { path: 'invoice-lines[*].quantity', dataType: 'Decimal', required: false, description: 'Item quantity' },
  { path: 'invoice-lines[*].price', dataType: 'Decimal', required: true, description: 'Unit price' },
  { path: 'invoice-lines[*].total', dataType: 'Decimal', required: false, description: 'Line total (read-only)' },
  { path: 'invoice-lines[*].tax-amount', dataType: 'Decimal', required: false, description: 'Line tax amount' },
  { path: 'invoice-lines[*].tax-rate', dataType: 'String', required: false, description: 'Line tax rate' },
  { path: 'invoice-lines[*].tax-code', dataType: 'String', required: false, description: 'Line-level tax code reference' },
  { path: 'invoice-lines[*].tax-code.id', dataType: 'Integer', required: true, description: 'Tax code ID' },
  { path: 'invoice-lines[*].uom.code', dataType: 'String', required: true, description: 'Unit of measure code' },
  { path: 'invoice-lines[*].currency.code', dataType: 'String', required: false, description: 'Line currency code' },
  { path: 'invoice-lines[*].account.code', dataType: 'String', required: false, description: 'GL account code' },
  { path: 'invoice-lines[*].item.id', dataType: 'Integer', required: false, description: 'Item catalog reference' },
  { path: 'invoice-lines[*].item.name', dataType: 'String', required: false, description: 'Item name' },
  { path: 'invoice-lines[*].commodity.id', dataType: 'Integer', required: false, description: 'Commodity reference' },
  { path: 'invoice-lines[*].source-part-num', dataType: 'String', required: false, description: 'Supplier part number' },
  { path: 'invoice-lines[*].order-line-id', dataType: 'Integer', required: false, description: 'Linked PO line ID' },
  { path: 'invoice-lines[*].po-number', dataType: 'String', required: false, description: 'PO number (read-only)' },
  { path: 'invoice-lines[*].match-reference', dataType: 'String', required: false, description: 'Three-way match reference for receipt/ASN' },
  { path: 'invoice-lines[*].contract.id', dataType: 'Integer', required: false, description: 'Contract reference' },
  { path: 'invoice-lines[*].period.id', dataType: 'Integer', required: false, description: 'Accounting period reference' },
  { path: 'invoice-lines[*].line-type', dataType: 'String', required: false, description: 'Line type classification' },
  { path: 'invoice-lines[*].net-weight', dataType: 'Decimal', required: false, description: 'Net weight' },
  { path: 'invoice-lines[*].status', dataType: 'String', required: false, description: 'Line status (read-only)' },
  { path: 'invoice-lines[*].created-at', dataType: 'DateTime', required: false, description: 'Line creation timestamp' },
  { path: 'invoice-lines[*].updated-at', dataType: 'DateTime', required: false, description: 'Line update timestamp' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COUPA REQUISITION FIELDS  (from RequisitionHeader + RequisitionLine)
// ═══════════════════════════════════════════════════════════════════════════════
const coupaRequisitionFields: SchemaFieldCreate[] = [
  // ── Header ──
  { path: 'id', dataType: 'Integer', required: false, description: 'Coupa unique identifier (read-only)' },
  { path: 'req-title', dataType: 'String', required: false, description: 'Optional title of the requisition (max 50)' },
  { path: 'status', dataType: 'String', required: false, description: 'Requisition status', example: 'approved' },
  { path: 'justification', dataType: 'String', required: false, description: 'Requisition justification comments' },
  { path: 'buyer-note', dataType: 'String', required: false, description: 'Comments or notes from the buyer' },
  { path: 'need-by-date', dataType: 'DateTime', required: false, description: 'Item need-by date' },
  { path: 'currency', dataType: 'String', required: false, description: 'Currency code (read-only)', example: 'USD' },
  { path: 'total', dataType: 'Decimal', required: false, description: 'Total in own currency (read-only)' },
  { path: 'total-with-estimated-tax', dataType: 'Decimal', required: false, description: 'Total including estimated tax' },
  { path: 'estimated-tax-amount', dataType: 'Decimal', required: false, description: 'Estimated tax amount' },
  { path: 'line-count', dataType: 'Integer', required: false, description: 'Number of lines (read-only)' },
  { path: 'requester.id', dataType: 'Integer', required: true, description: 'Requester user reference' },
  { path: 'requester.login', dataType: 'String', required: false, description: 'Requester login name' },
  { path: 'requester.email', dataType: 'String', required: false, description: 'Requester email' },
  { path: 'requested-by.id', dataType: 'Integer', required: true, description: 'Requested-by user reference' },
  { path: 'created-by.id', dataType: 'Integer', required: true, description: 'Created-by user reference' },
  { path: 'department.id', dataType: 'Integer', required: false, description: 'Department reference' },
  { path: 'department.name', dataType: 'String', required: false, description: 'Department name' },
  { path: 'ship-to-address.id', dataType: 'Integer', required: true, description: 'Ship-to address reference' },
  { path: 'ship-to-attention', dataType: 'String', required: false, description: 'Ship-to attention line (max 255)' },
  { path: 'pcard.id', dataType: 'Integer', required: false, description: 'Purchasing card reference' },
  { path: 'external-po-reference', dataType: 'String', required: false, description: 'External PO reference override' },
  { path: 'receiving-warehouse-id', dataType: 'Integer', required: false, description: 'Receiving warehouse ID' },
  { path: 'exported', dataType: 'Boolean', required: false, description: 'Whether exported (read-only)' },
  { path: 'last-exported-at', dataType: 'DateTime', required: false, description: 'Last exported timestamp' },
  { path: 'submitted-at', dataType: 'DateTime', required: false, description: 'Submission timestamp (read-only)' },
  { path: 'created-at', dataType: 'DateTime', required: false, description: 'Creation timestamp (read-only)' },
  { path: 'updated-at', dataType: 'DateTime', required: false, description: 'Update timestamp (read-only)' },

  // ── Requisition Lines ──
  { path: 'requisition-lines[*].id', dataType: 'Integer', required: false, description: 'Line Coupa ID (read-only)' },
  { path: 'requisition-lines[*].line-num', dataType: 'Integer', required: false, description: 'Line number' },
  { path: 'requisition-lines[*].description', dataType: 'String', required: true, description: 'Line description (max 255)' },
  { path: 'requisition-lines[*].line-type', dataType: 'String', required: false, description: 'RequisitionQuantityLine or RequisitionAmountLine' },
  { path: 'requisition-lines[*].quantity', dataType: 'Decimal', required: false, description: 'Item quantity' },
  { path: 'requisition-lines[*].unit-price', dataType: 'Decimal', required: false, description: 'Line item price' },
  { path: 'requisition-lines[*].total', dataType: 'Decimal', required: false, description: 'Line total (read-only)' },
  { path: 'requisition-lines[*].total-with-estimated-tax', dataType: 'Decimal', required: false, description: 'Line total with estimated tax' },
  { path: 'requisition-lines[*].currency.code', dataType: 'String', required: false, description: 'Line currency code' },
  { path: 'requisition-lines[*].need-by-date', dataType: 'DateTime', required: false, description: 'Line need-by date' },
  { path: 'requisition-lines[*].item.id', dataType: 'Integer', required: true, description: 'Item catalog reference' },
  { path: 'requisition-lines[*].item.name', dataType: 'String', required: false, description: 'Item name' },
  { path: 'requisition-lines[*].commodity.id', dataType: 'Integer', required: true, description: 'Commodity reference' },
  { path: 'requisition-lines[*].uom.code', dataType: 'String', required: false, description: 'Unit of measure code' },
  { path: 'requisition-lines[*].account.code', dataType: 'String', required: false, description: 'GL account code' },
  { path: 'requisition-lines[*].supplier.id', dataType: 'Integer', required: false, description: 'Supplier reference' },
  { path: 'requisition-lines[*].supplier.name', dataType: 'String', required: false, description: 'Supplier name' },
  { path: 'requisition-lines[*].supplier-site.id', dataType: 'Integer', required: false, description: 'Supplier site reference' },
  { path: 'requisition-lines[*].source-part-num', dataType: 'String', required: false, description: 'Source part number' },
  { path: 'requisition-lines[*].manufacturer-name', dataType: 'String', required: false, description: 'Manufacturer name' },
  { path: 'requisition-lines[*].manufacturer-part-number', dataType: 'String', required: false, description: 'Manufacturer part number' },
  { path: 'requisition-lines[*].contract.id', dataType: 'Integer', required: false, description: 'Contract reference' },
  { path: 'requisition-lines[*].payment-term.id', dataType: 'Integer', required: false, description: 'Payment term reference' },
  { path: 'requisition-lines[*].shipping-term.id', dataType: 'Integer', required: false, description: 'Shipping term reference' },
  { path: 'requisition-lines[*].receipt-required', dataType: 'Boolean', required: false, description: 'Whether receipt is required' },
  { path: 'requisition-lines[*].service-sheet-required', dataType: 'Boolean', required: false, description: 'Whether service sheet is required' },
  { path: 'requisition-lines[*].transmission-method-override', dataType: 'String', required: false, description: 'Transmission method override' },
  { path: 'requisition-lines[*].status', dataType: 'String', required: false, description: 'Line status (read-only)' },
  { path: 'requisition-lines[*].created-at', dataType: 'DateTime', required: false, description: 'Line creation timestamp' },
  { path: 'requisition-lines[*].updated-at', dataType: 'DateTime', required: false, description: 'Line update timestamp' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COUPA PURCHASE ORDER FIELDS  (from OrderHeader + OrderLine)
// ═══════════════════════════════════════════════════════════════════════════════
const coupaPurchaseOrderFields: SchemaFieldCreate[] = [
  // ── Header ──
  { path: 'id', dataType: 'Integer', required: false, description: 'Coupa internal PO ID (read-only)' },
  { path: 'po-number', dataType: 'String', required: true, description: 'PO number (max 20)', example: 'PO-123456' },
  { path: 'status', dataType: 'String', required: false, description: 'PO status', example: 'issued' },
  { path: 'version', dataType: 'Integer', required: false, description: 'PO supplier version number' },
  { path: 'currency.code', dataType: 'String', required: false, description: 'PO currency code' },
  { path: 'total', dataType: 'Decimal', required: false, description: 'PO total amount (read-only)' },
  { path: 'total-with-estimated-tax', dataType: 'Decimal', required: false, description: 'Total with estimated tax' },
  { path: 'estimated-tax-amount', dataType: 'Decimal', required: false, description: 'Estimated tax amount' },
  { path: 'supplier.id', dataType: 'Integer', required: true, description: 'Supplier reference' },
  { path: 'supplier.name', dataType: 'String', required: false, description: 'Supplier name' },
  { path: 'supplier.number', dataType: 'String', required: false, description: 'Supplier number' },
  { path: 'supplier-site.id', dataType: 'Integer', required: false, description: 'Supplier site reference' },
  { path: 'requester.id', dataType: 'Integer', required: false, description: 'Requester user reference' },
  { path: 'ship-to-user.id', dataType: 'Integer', required: true, description: 'Ship-to user reference' },
  { path: 'ship-to-address.id', dataType: 'Integer', required: true, description: 'Ship-to address reference' },
  { path: 'ship-to-attention', dataType: 'String', required: false, description: 'Ship-to attention (max 255)' },
  { path: 'payment-term.id', dataType: 'Integer', required: false, description: 'Payment term reference' },
  { path: 'payment-method', dataType: 'String', required: false, description: 'Payment method' },
  { path: 'shipping-term.id', dataType: 'Integer', required: false, description: 'Shipping term reference' },
  { path: 'requisition-header.id', dataType: 'Integer', required: false, description: 'Source requisition reference' },
  { path: 'pcard.id', dataType: 'Integer', required: false, description: 'Purchasing card reference' },
  { path: 'acknowledged-flag', dataType: 'Boolean', required: false, description: 'Whether PO has been acknowledged' },
  { path: 'acknowledged-at', dataType: 'DateTime', required: false, description: 'Acknowledgement timestamp' },
  { path: 'confirmation-status', dataType: 'String', required: false, description: 'Confirmation status (read-only)' },
  { path: 'transmission-status', dataType: 'String', required: false, description: 'Transmission status (read-only)' },
  { path: 'transmission-method-override', dataType: 'String', required: false, description: 'Transmission method override' },
  { path: 'transmission-emails', dataType: 'String', required: false, description: 'Transmission email addresses' },
  { path: 'type', dataType: 'String', required: false, description: 'Order type (ExternalOrderHeader)' },
  { path: 'classification', dataType: 'String', required: false, description: 'msp, supplier, or vms' },
  { path: 'exported', dataType: 'Boolean', required: false, description: 'Whether exported (read-only)' },
  { path: 'last-exported-at', dataType: 'DateTime', required: false, description: 'Last exported timestamp' },
  { path: 'created-at', dataType: 'DateTime', required: false, description: 'Creation timestamp (read-only)' },
  { path: 'updated-at', dataType: 'DateTime', required: false, description: 'Update timestamp (read-only)' },

  // ── PO Lines ──
  { path: 'order-lines[*].id', dataType: 'Integer', required: false, description: 'Line Coupa ID (read-only)' },
  { path: 'order-lines[*].line-num', dataType: 'String', required: false, description: 'Line number' },
  { path: 'order-lines[*].description', dataType: 'String', required: true, description: 'Line description (max 255)' },
  { path: 'order-lines[*].quantity', dataType: 'Decimal', required: false, description: 'Item quantity' },
  { path: 'order-lines[*].price', dataType: 'Decimal', required: false, description: 'Unit price' },
  { path: 'order-lines[*].total', dataType: 'Decimal', required: false, description: 'Line total (read-only)' },
  { path: 'order-lines[*].currency.code', dataType: 'String', required: true, description: 'Line currency code' },
  { path: 'order-lines[*].uom.code', dataType: 'String', required: false, description: 'Unit of measure code' },
  { path: 'order-lines[*].account.code', dataType: 'String', required: true, description: 'GL account code' },
  { path: 'order-lines[*].account-type.id', dataType: 'Integer', required: false, description: 'Account type reference' },
  { path: 'order-lines[*].item.id', dataType: 'Integer', required: false, description: 'Item catalog reference' },
  { path: 'order-lines[*].item.name', dataType: 'String', required: false, description: 'Item name' },
  { path: 'order-lines[*].commodity.id', dataType: 'Integer', required: false, description: 'Commodity reference' },
  { path: 'order-lines[*].department.id', dataType: 'Integer', required: false, description: 'Department reference' },
  { path: 'order-lines[*].contract.id', dataType: 'Integer', required: false, description: 'Contract reference' },
  { path: 'order-lines[*].invoiced', dataType: 'Decimal', required: false, description: 'Amount already invoiced' },
  { path: 'order-lines[*].received', dataType: 'Decimal', required: false, description: 'Amount already received' },
  { path: 'order-lines[*].match-type', dataType: 'String', required: false, description: 'Invoice match type (2-way, 3-way, etc.)' },
  { path: 'order-lines[*].manufacturer-name', dataType: 'String', required: false, description: 'Manufacturer name' },
  { path: 'order-lines[*].manufacturer-part-number', dataType: 'String', required: false, description: 'Manufacturer part number' },
  { path: 'order-lines[*].source-part-num', dataType: 'String', required: false, description: 'Supplier part number' },
  { path: 'order-lines[*].supp-aux-part-num', dataType: 'String', required: false, description: 'Supplier auxiliary part number' },
  { path: 'order-lines[*].external-reference-number', dataType: 'String', required: true, description: 'External reference number' },
  { path: 'order-lines[*].external-reference-type', dataType: 'String', required: false, description: 'staff_augmentation or sow_project' },
  { path: 'order-lines[*].need-by-date', dataType: 'DateTime', required: false, description: 'Line need-by date' },
  { path: 'order-lines[*].payment-term.id', dataType: 'Integer', required: false, description: 'Line payment term' },
  { path: 'order-lines[*].status', dataType: 'String', required: false, description: 'Line status (read-only)' },
  { path: 'order-lines[*].created-at', dataType: 'DateTime', required: false, description: 'Line creation timestamp' },
  { path: 'order-lines[*].updated-at', dataType: 'DateTime', required: false, description: 'Line update timestamp' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COUPA SUPPLIER INFORMATION FIELDS
// ═══════════════════════════════════════════════════════════════════════════════
const coupaSupplierInformationFields: SchemaFieldCreate[] = [
  { path: 'id', dataType: 'Integer', required: false, description: 'SIM record ID (read-only)' },
  { path: 'name', dataType: 'String', required: true, description: 'Supplier name (max 100)' },
  { path: 'status', dataType: 'String', required: true, description: 'Supplier information status', example: 'active' },
  { path: 'display-name', dataType: 'String', required: false, description: 'Supplier display name (max 255)' },
  { path: 'supplier-name', dataType: 'String', required: false, description: 'Supplier name reference' },
  { path: 'supplier-number', dataType: 'String', required: false, description: 'Supplier number' },
  { path: 'supplier-id', dataType: 'Integer', required: false, description: 'Supplier Coupa ID' },
  { path: 'duns-number', dataType: 'String', required: false, description: 'Dun & Bradstreet number' },
  { path: 'federal-tax-num', dataType: 'String', required: false, description: 'Federal Tax ID' },
  { path: 'tax-classification', dataType: 'String', required: false, description: 'US Tax classification' },
  { path: 'income-type', dataType: 'String', required: false, description: 'Income type' },
  { path: 'tax-region', dataType: 'String', required: false, description: 'Tax region' },
  { path: 'preferred-currency.code', dataType: 'String', required: false, description: 'Preferred/default currency code' },
  { path: 'preferred-language.code', dataType: 'String', required: false, description: 'Preferred language code' },
  { path: 'payment-term.id', dataType: 'Integer', required: false, description: 'Payment term reference' },
  { path: 'payment-method', dataType: 'String', required: false, description: 'Hold payment method' },
  { path: 'po-method', dataType: 'String', required: false, description: 'PO transmission method (cxml, xml, email, etc.)' },
  { path: 'po-email', dataType: 'String', required: false, description: 'PO email address (max 255)' },
  { path: 'po-change-method', dataType: 'String', required: false, description: 'PO change transmission method' },
  { path: 'invoice-matching-level', dataType: 'String', required: false, description: 'Invoice matching level (2-way, 3-way, etc.)' },
  { path: 'hold-invoices-for-ap-review', dataType: 'Boolean', required: false, description: 'Hold invoices for AP review' },
  { path: 'send-invoices-to-approvals', dataType: 'Boolean', required: false, description: 'Send invoices to approvals' },
  { path: 'buyer-hold', dataType: 'Boolean', required: false, description: 'Hold POs for buyer review' },
  { path: 'one-time-supplier', dataType: 'Boolean', required: false, description: 'One-time supplier indicator' },
  { path: 'strategic-supplier', dataType: 'Boolean', required: false, description: 'Strategic supplier indicator' },
  { path: 'minority-indicator', dataType: 'Boolean', required: false, description: 'MWBE indicator' },
  { path: 'industry', dataType: 'String', required: false, description: 'Primary industry' },
  { path: 'supplier-region', dataType: 'String', required: false, description: 'Region (AMER, EMEA, APAC, Japan)' },
  { path: 'organization-type', dataType: 'String', required: false, description: 'Corporation, Individual, Partnership, etc.' },
  { path: 'parent-company-name', dataType: 'String', required: false, description: 'Parent company name' },
  { path: 'website', dataType: 'String', required: false, description: 'Supplier website URL' },
  { path: 'goods-services-provided', dataType: 'String', required: false, description: 'Description of goods/services' },
  { path: 'inco-terms', dataType: 'String', required: false, description: 'Incoterms (EXW, FCA, FOB, CIF, etc.)' },
  { path: 'savings-pct', dataType: 'Decimal', required: false, description: 'Savings percentage' },
  { path: 'cxml-domain', dataType: 'String', required: false, description: 'cXML \'from\' domain' },
  { path: 'cxml-identity', dataType: 'String', required: false, description: 'cXML \'from\' identity' },
  { path: 'cxml-url', dataType: 'String', required: false, description: 'cXML target URL' },
  { path: 'country-of-operation.code', dataType: 'String', required: false, description: 'Country of operation ISO code' },
  { path: 'estimated-spend-amount', dataType: 'Decimal', required: false, description: 'Estimated spend amount' },
  { path: 'created-at', dataType: 'DateTime', required: false, description: 'SIM record creation timestamp' },
  { path: 'updated-at', dataType: 'DateTime', required: false, description: 'SIM record update timestamp' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COUPA SUPPLIER FIELDS
// ═══════════════════════════════════════════════════════════════════════════════
const coupaSupplierFields: SchemaFieldCreate[] = [
  { path: 'id', dataType: 'Integer', required: false, description: 'Coupa internal supplier ID (read-only)' },
  { path: 'name', dataType: 'String', required: true, description: 'Supplier name (max 100)' },
  { path: 'number', dataType: 'String', required: false, description: 'Supplier number (max 255)' },
  { path: 'display-name', dataType: 'String', required: false, description: 'Display name (max 255)' },
  { path: 'status', dataType: 'String', required: false, description: 'Supplier status', example: 'active' },
  { path: 'duns', dataType: 'String', required: false, description: 'DUNS number' },
  { path: 'tax-id', dataType: 'String', required: false, description: 'Tax ID' },
  { path: 'payment-method', dataType: 'String', required: true, description: 'Default payment method' },
  { path: 'payment-term.id', dataType: 'Integer', required: false, description: 'Payment term reference' },
  { path: 'po-method', dataType: 'String', required: false, description: 'PO transmission method (cxml, xml, email, etc.)' },
  { path: 'po-email', dataType: 'String', required: false, description: 'PO email address' },
  { path: 'po-change-method', dataType: 'String', required: false, description: 'PO change method' },
  { path: 'invoice-matching-level', dataType: 'String', required: false, description: '2-way, 3-way, 3-way-direct, none' },
  { path: 'hold-invoices-for-ap-review', dataType: 'Boolean', required: false, description: 'Hold invoices for AP review' },
  { path: 'send-invoices-to-approvals', dataType: 'Boolean', required: false, description: 'Send invoices to approvals' },
  { path: 'on-hold', dataType: 'Boolean', required: false, description: 'Supplier is on hold' },
  { path: 'one-time-supplier', dataType: 'Boolean', required: false, description: 'One-time supplier indicator' },
  { path: 'strategic-supplier', dataType: 'Boolean', required: false, description: 'Strategic supplier indicator' },
  { path: 'savings-pct', dataType: 'Decimal', required: false, description: 'Savings percentage' },
  { path: 'default-locale', dataType: 'String', required: false, description: 'Default locale for emails' },
  { path: 'primary-contact.id', dataType: 'Integer', required: true, description: 'Primary contact reference' },
  { path: 'primary-contact.email', dataType: 'String', required: false, description: 'Primary contact email' },
  { path: 'primary-address.id', dataType: 'Integer', required: true, description: 'Primary address reference' },
  { path: 'primary-address.street1', dataType: 'String', required: false, description: 'Primary address street' },
  { path: 'primary-address.city', dataType: 'String', required: false, description: 'Primary address city' },
  { path: 'primary-address.state', dataType: 'String', required: false, description: 'Primary address state' },
  { path: 'primary-address.postal-code', dataType: 'String', required: false, description: 'Primary address postal code' },
  { path: 'primary-address.country.code', dataType: 'String', required: false, description: 'Primary address country code' },
  { path: 'enterprise.id', dataType: 'Integer', required: true, description: 'Enterprise reference' },
  { path: 'online-store.id', dataType: 'Integer', required: true, description: 'Online store reference' },
  { path: 'shipping-term.id', dataType: 'Integer', required: false, description: 'Shipping term reference' },
  { path: 'tax-code.id', dataType: 'Integer', required: false, description: 'Tax code reference' },
  { path: 'cxml-domain', dataType: 'String', required: false, description: 'cXML domain' },
  { path: 'cxml-identity', dataType: 'String', required: false, description: 'cXML identity' },
  { path: 'cxml-url', dataType: 'String', required: false, description: 'cXML URL for PO delivery' },
  { path: 'cxml-supplier-domain', dataType: 'String', required: false, description: 'cXML supplier domain' },
  { path: 'cxml-supplier-identity', dataType: 'String', required: false, description: 'cXML supplier identity' },
  { path: 'storefront-url', dataType: 'String', required: false, description: 'Supplier storefront URL' },
  { path: 'website', dataType: 'String', required: false, description: 'Supplier website' },
  { path: 'coupa-connect-secret', dataType: 'String', required: false, description: 'Coupa Connect secret (read-only)' },
  { path: 'parent.id', dataType: 'Integer', required: false, description: 'Parent supplier reference' },
  { path: 'created-at', dataType: 'DateTime', required: false, description: 'Creation timestamp (read-only)' },
  { path: 'updated-at', dataType: 'DateTime', required: false, description: 'Update timestamp (read-only)' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COUPA LOOKUP FIELDS  (Coupa /api/lookups endpoint)
// ═══════════════════════════════════════════════════════════════════════════════
const coupaLookupFields: SchemaFieldCreate[] = [
  { path: 'id', dataType: 'Integer', required: false, description: 'Coupa lookup ID (read-only)' },
  { path: 'name', dataType: 'String', required: true, description: 'Lookup name (unique identifier)' },
  { path: 'description', dataType: 'String', required: false, description: 'Lookup description' },
  { path: 'active', dataType: 'Boolean', required: false, description: 'Whether lookup is active' },
  { path: 'parent.id', dataType: 'Integer', required: false, description: 'Parent lookup reference (for hierarchical lookups)' },
  { path: 'parent.name', dataType: 'String', required: false, description: 'Parent lookup name' },
  { path: 'created-at', dataType: 'DateTime', required: false, description: 'Creation timestamp (read-only)' },
  { path: 'updated-at', dataType: 'DateTime', required: false, description: 'Update timestamp (read-only)' },
  { path: 'created-by.id', dataType: 'Integer', required: false, description: 'Created-by user ID' },
  { path: 'updated-by.id', dataType: 'Integer', required: false, description: 'Updated-by user ID' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COUPA LOOKUP VALUE FIELDS  (Coupa /api/lookup_values endpoint)
// ═══════════════════════════════════════════════════════════════════════════════
const coupaLookupValueFields: SchemaFieldCreate[] = [
  { path: 'id', dataType: 'Integer', required: false, description: 'Coupa lookup value ID (read-only)' },
  { path: 'name', dataType: 'String', required: true, description: 'Lookup value display name' },
  { path: 'active', dataType: 'Boolean', required: false, description: 'Whether lookup value is active' },
  { path: 'external-ref-num', dataType: 'String', required: false, description: 'External reference number for ERP mapping' },
  { path: 'external-ref-code', dataType: 'String', required: false, description: 'External reference code for ERP mapping' },
  { path: 'lookup.id', dataType: 'Integer', required: true, description: 'Parent lookup reference' },
  { path: 'lookup.name', dataType: 'String', required: false, description: 'Parent lookup name' },
  { path: 'parent.id', dataType: 'Integer', required: false, description: 'Parent lookup value (for hierarchical values)' },
  { path: 'parent.name', dataType: 'String', required: false, description: 'Parent lookup value name' },
  { path: 'description', dataType: 'String', required: false, description: 'Value description' },
  { path: 'custom-fields', dataType: 'Object', required: false, description: 'Custom field key-value pairs' },
  { path: 'created-at', dataType: 'DateTime', required: false, description: 'Creation timestamp (read-only)' },
  { path: 'updated-at', dataType: 'DateTime', required: false, description: 'Update timestamp (read-only)' },
  { path: 'created-by.id', dataType: 'Integer', required: false, description: 'Created-by user ID' },
  { path: 'updated-by.id', dataType: 'Integer', required: false, description: 'Updated-by user ID' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COUPA RECEIVING TRANSACTION FIELDS  (Coupa /api/inventory/transactions)
// ═══════════════════════════════════════════════════════════════════════════════
const coupaReceivingTransactionFields: SchemaFieldCreate[] = [
  { path: 'id', dataType: 'Integer', required: false, description: 'Transaction ID (read-only)' },
  { path: 'type', dataType: 'String', required: true, description: 'Transaction type (ReceivingTransaction)', example: 'ReceivingTransaction' },
  { path: 'status', dataType: 'String', required: false, description: 'Transaction status (received, pending, etc.)' },
  { path: 'quantity', dataType: 'Decimal', required: true, description: 'Received quantity' },
  { path: 'price', dataType: 'Decimal', required: false, description: 'Unit price at time of receipt' },
  { path: 'total', dataType: 'Decimal', required: false, description: 'Total value of receipt line' },
  { path: 'currency.code', dataType: 'String', required: false, description: 'Currency code' },
  { path: 'uom.code', dataType: 'String', required: false, description: 'Unit of measure code' },
  { path: 'receipt-date', dataType: 'DateTime', required: true, description: 'Date the goods were received' },
  { path: 'order-header.id', dataType: 'Integer', required: false, description: 'Purchase order header reference' },
  { path: 'order-header.po-number', dataType: 'String', required: false, description: 'PO number' },
  { path: 'order-line.id', dataType: 'Integer', required: false, description: 'Purchase order line reference' },
  { path: 'order-line.line-num', dataType: 'String', required: false, description: 'PO line number' },
  { path: 'asn-header.id', dataType: 'Integer', required: false, description: 'ASN header reference' },
  { path: 'asn-line.id', dataType: 'Integer', required: false, description: 'ASN line reference' },
  { path: 'receiving-warehouse.id', dataType: 'Integer', required: false, description: 'Receiving warehouse reference' },
  { path: 'receiving-warehouse.name', dataType: 'String', required: false, description: 'Warehouse name' },
  { path: 'account.code', dataType: 'String', required: false, description: 'GL account code' },
  { path: 'item.id', dataType: 'Integer', required: false, description: 'Item reference' },
  { path: 'item.name', dataType: 'String', required: false, description: 'Item name' },
  { path: 'supplier.id', dataType: 'Integer', required: false, description: 'Supplier reference' },
  { path: 'match-reference', dataType: 'String', required: false, description: 'Match reference for three-way matching' },
  { path: 'barcode', dataType: 'String', required: false, description: 'Item barcode' },
  { path: 'inspection-code', dataType: 'String', required: false, description: 'Quality inspection code' },
  { path: 'inspection-note', dataType: 'String', required: false, description: 'Quality inspection note' },
  { path: 'exported', dataType: 'Boolean', required: false, description: 'Whether exported' },
  { path: 'last-exported-at', dataType: 'DateTime', required: false, description: 'Last exported timestamp' },
  { path: 'created-at', dataType: 'DateTime', required: false, description: 'Creation timestamp (read-only)' },
  { path: 'updated-at', dataType: 'DateTime', required: false, description: 'Update timestamp (read-only)' },
  { path: 'created-by.id', dataType: 'Integer', required: false, description: 'Created-by user ID' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COUPA INVENTORY TRANSACTION FIELDS  (from InventoryBalance definition)
// ═══════════════════════════════════════════════════════════════════════════════
const coupaInventoryTransactionFields: SchemaFieldCreate[] = [
  { path: 'id', dataType: 'Integer', required: false, description: 'Inventory balance ID (read-only)' },
  { path: 'type', dataType: 'String', required: false, description: 'Transaction type', example: 'InventoryBalanceAdjustment' },
  { path: 'quantity', dataType: 'Decimal', required: true, description: 'Quantity on hand or adjustment' },
  { path: 'unit-price', dataType: 'Decimal', required: false, description: 'Unit price' },
  { path: 'total-value', dataType: 'Decimal', required: false, description: 'Total value of inventory' },
  { path: 'currency.code', dataType: 'String', required: false, description: 'Currency code' },
  { path: 'uom.code', dataType: 'String', required: false, description: 'Unit of measure code' },
  { path: 'item.id', dataType: 'Integer', required: true, description: 'Item reference' },
  { path: 'item.name', dataType: 'String', required: false, description: 'Item name' },
  { path: 'item.item-number', dataType: 'String', required: false, description: 'Item number' },
  { path: 'warehouse.id', dataType: 'Integer', required: true, description: 'Warehouse reference' },
  { path: 'warehouse.name', dataType: 'String', required: false, description: 'Warehouse name' },
  { path: 'warehouse-location.id', dataType: 'Integer', required: false, description: 'Warehouse location reference' },
  { path: 'warehouse-location.label', dataType: 'String', required: false, description: 'Location label (aisle/bin/level)' },
  { path: 'inventory-organization.id', dataType: 'Integer', required: false, description: 'Inventory organization reference' },
  { path: 'account.code', dataType: 'String', required: false, description: 'GL account code' },
  { path: 'lot-number', dataType: 'String', required: false, description: 'Lot or batch number' },
  { path: 'serial-number', dataType: 'String', required: false, description: 'Serial number' },
  { path: 'expiry-date', dataType: 'DateTime', required: false, description: 'Item expiry date' },
  { path: 'transaction-date', dataType: 'DateTime', required: false, description: 'Date of transaction' },
  { path: 'reason', dataType: 'String', required: false, description: 'Adjustment/transaction reason' },
  { path: 'supplier.id', dataType: 'Integer', required: false, description: 'Supplier reference' },
  { path: 'order-line.id', dataType: 'Integer', required: false, description: 'Linked PO line reference' },
  { path: 'receipt.id', dataType: 'Integer', required: false, description: 'Linked receipt reference' },
  { path: 'exported', dataType: 'Boolean', required: false, description: 'Whether exported' },
  { path: 'created-at', dataType: 'DateTime', required: false, description: 'Creation timestamp (read-only)' },
  { path: 'updated-at', dataType: 'DateTime', required: false, description: 'Update timestamp (read-only)' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COUPA APPROVAL FIELDS  (from Approval definition)
// ═══════════════════════════════════════════════════════════════════════════════
const coupaApprovalFields: SchemaFieldCreate[] = [
  { path: 'id', dataType: 'Integer', required: false, description: 'Approval ID (read-only)' },
  { path: 'status', dataType: 'String', required: false, description: 'Approval status', example: 'approved' },
  { path: 'approval-date', dataType: 'DateTime', required: false, description: 'Date of approval action' },
  { path: 'approvable-type', dataType: 'String', required: false, description: 'Type of object being approved (e.g. RequisitionHeader, InvoiceHeader)' },
  { path: 'approvable-id', dataType: 'Integer', required: false, description: 'ID of the object being approved' },
  { path: 'approver.id', dataType: 'Integer', required: false, description: 'Approver user reference' },
  { path: 'approver.login', dataType: 'String', required: false, description: 'Approver login name' },
  { path: 'approver.email', dataType: 'String', required: false, description: 'Approver email' },
  { path: 'approver.firstname', dataType: 'String', required: false, description: 'Approver first name' },
  { path: 'approver.lastname', dataType: 'String', required: false, description: 'Approver last name' },
  { path: 'approver-type', dataType: 'String', required: false, description: 'Approver type (User, UserGroup)' },
  { path: 'approval-chain.id', dataType: 'Integer', required: false, description: 'Approval chain reference' },
  { path: 'position', dataType: 'Integer', required: false, description: 'Position in approval chain' },
  { path: 'reason.id', dataType: 'Integer', required: false, description: 'Approval reason reference' },
  { path: 'note', dataType: 'String', required: false, description: 'Approval note or comment' },
  { path: 'delegate', dataType: 'Boolean', required: false, description: 'Whether delegated approval' },
  { path: 'delegated-by.id', dataType: 'Integer', required: false, description: 'Delegated by user reference' },
  { path: 'created-at', dataType: 'DateTime', required: false, description: 'Creation timestamp (read-only)' },
  { path: 'updated-at', dataType: 'DateTime', required: false, description: 'Update timestamp (read-only)' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA PACK DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════
interface SchemaPackDef {
  id: string;
  name: string;
  system: string;
  object: string;
  version: string;
  fields: SchemaFieldCreate[];
}

const COUPA_SCHEMA_PACKS: SchemaPackDef[] = [
  { id: 'sp_coupa_invoice_v2', name: 'Coupa Invoice v2', system: 'Coupa', object: 'Invoice', version: '2', fields: coupaInvoiceFields },
  { id: 'sp_coupa_requisition_v1', name: 'Coupa Requisition v1', system: 'Coupa', object: 'Requisition', version: '1', fields: coupaRequisitionFields },
  { id: 'sp_coupa_purchase_order_v1', name: 'Coupa Purchase Order v1', system: 'Coupa', object: 'PurchaseOrder', version: '1', fields: coupaPurchaseOrderFields },
  { id: 'sp_coupa_supplier_info_v1', name: 'Coupa Supplier Information v1', system: 'Coupa', object: 'SupplierInformation', version: '1', fields: coupaSupplierInformationFields },
  { id: 'sp_coupa_supplier_v1', name: 'Coupa Supplier v1', system: 'Coupa', object: 'Supplier', version: '1', fields: coupaSupplierFields },
  { id: 'sp_coupa_lookup_v1', name: 'Coupa Lookup v1', system: 'Coupa', object: 'Lookup', version: '1', fields: coupaLookupFields },
  { id: 'sp_coupa_lookup_value_v1', name: 'Coupa Lookup Value v1', system: 'Coupa', object: 'LookupValue', version: '1', fields: coupaLookupValueFields },
  { id: 'sp_coupa_receiving_txn_v1', name: 'Coupa Receiving Transaction v1', system: 'Coupa', object: 'ReceivingTransaction', version: '1', fields: coupaReceivingTransactionFields },
  { id: 'sp_coupa_inventory_txn_v1', name: 'Coupa Inventory Transaction v1', system: 'Coupa', object: 'InventoryTransaction', version: '1', fields: coupaInventoryTransactionFields },
  { id: 'sp_coupa_approval_v1', name: 'Coupa Approval v1', system: 'Coupa', object: 'Approval', version: '1', fields: coupaApprovalFields },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const EIGHT_BOX_WORKFLOW = {
  boxes: [
    { id: 'trigger', label: 'Trigger', type: 'TRIGGER', order: 1, icon: 'bolt', configurable: true },
    { id: 'source', label: 'Source Connection', type: 'SOURCE', order: 2, icon: 'database', configurable: true },
    { id: 'fetch', label: 'Data Fetch', type: 'FETCH', order: 3, icon: 'download', configurable: false },
    { id: 'mapping', label: 'Mapping & Transform', type: 'MAPPING', order: 4, icon: 'schema', configurable: true },
    { id: 'rules', label: 'Validation Logic', type: 'RULES', order: 5, icon: 'rule', configurable: true },
    { id: 'target', label: 'Target Connection', type: 'TARGET', order: 6, icon: 'dns', configurable: true },
    { id: 'delivery', label: 'Delivery', type: 'DELIVERY', order: 7, icon: 'send', configurable: false },
    { id: 'error', label: 'Error Handling', type: 'ERROR', order: 8, icon: 'error', configurable: true },
  ],
};

interface TemplateDef {
  id: string;
  name: string;
  description: string;
  class: 'CERTIFIED' | 'STARTER';
  sourceSystem: string;
  targetSystem: string;
  businessObject: string;
  version: string;
  schemaPackId: string;
  role: 'SOURCE' | 'TARGET';
}

// Coupa as SOURCE templates (Coupa → SAP placeholder)
const COUPA_SOURCE_TEMPLATES: TemplateDef[] = [
  {
    id: 'tpl_coupa_invoice_sap_v1',
    name: 'Coupa Invoice → SAP Invoice',
    description: 'Certified business accelerator. Syncs approved invoices from Coupa to SAP FI via BAPI_ACC_DOCUMENT_POST. Includes supplier normalization, tax code mapping, and cost center derivation.',
    class: 'CERTIFIED', sourceSystem: 'Coupa', targetSystem: 'SAP', businessObject: 'INVOICE',
    version: '1.0.0', schemaPackId: 'sp_coupa_invoice_v2', role: 'SOURCE',
  },
  {
    id: 'tpl_coupa_requisition_sap',
    name: 'Coupa Requisition → SAP',
    description: 'Syncs approved requisitions from Coupa to SAP. Maps requisition headers and line items with commodity mapping and cost allocation derivation.',
    class: 'CERTIFIED', sourceSystem: 'Coupa', targetSystem: 'SAP', businessObject: 'REQUISITION',
    version: '1.0.0', schemaPackId: 'sp_coupa_requisition_v1', role: 'SOURCE',
  },
  {
    id: 'tpl_coupa_po_sap',
    name: 'Coupa Purchase Order → SAP',
    description: 'Certified PO outbound flow from Coupa to SAP MM. Handles supplier resolution, tax determination, and three-way matching setup.',
    class: 'CERTIFIED', sourceSystem: 'Coupa', targetSystem: 'SAP', businessObject: 'PURCHASE_ORDER',
    version: '1.0.0', schemaPackId: 'sp_coupa_purchase_order_v1', role: 'SOURCE',
  },
  {
    id: 'tpl_coupa_supplier_info_sap',
    name: 'Coupa Supplier Information → SAP',
    description: 'Syncs Coupa Supplier Information Management (SIM) records to SAP vendor master. Includes tax classification, payment terms, and address normalization.',
    class: 'CERTIFIED', sourceSystem: 'Coupa', targetSystem: 'SAP', businessObject: 'SUPPLIER_INFORMATION',
    version: '1.0.0', schemaPackId: 'sp_coupa_supplier_info_v1', role: 'SOURCE',
  },
  {
    id: 'tpl_coupa_supplier_sap',
    name: 'Coupa Supplier → SAP',
    description: 'Supplier master sync from Coupa to SAP. Handles primary address/contact mapping, cXML configuration, and payment method derivation.',
    class: 'CERTIFIED', sourceSystem: 'Coupa', targetSystem: 'SAP', businessObject: 'SUPPLIER',
    version: '1.0.0', schemaPackId: 'sp_coupa_supplier_v1', role: 'SOURCE',
  },
  {
    id: 'tpl_coupa_lookup_erp',
    name: 'Coupa Lookup → ERP',
    description: 'Syncs Coupa lookup definitions to ERP reference data tables. Useful for maintaining consistent code tables across systems.',
    class: 'STARTER', sourceSystem: 'Coupa', targetSystem: 'ERP', businessObject: 'LOOKUP',
    version: '1.0.0', schemaPackId: 'sp_coupa_lookup_v1', role: 'SOURCE',
  },
  {
    id: 'tpl_coupa_lookup_value_erp',
    name: 'Coupa Lookup Value → ERP',
    description: 'Syncs Coupa lookup values to ERP reference data. Maps external reference codes for cross-system value resolution.',
    class: 'STARTER', sourceSystem: 'Coupa', targetSystem: 'ERP', businessObject: 'LOOKUP_VALUE',
    version: '1.0.0', schemaPackId: 'sp_coupa_lookup_value_v1', role: 'SOURCE',
  },
  {
    id: 'tpl_coupa_receipt_sap',
    name: 'Coupa Receiving Transaction → SAP',
    description: 'Syncs goods receipt transactions from Coupa to SAP MM. Includes PO matching, warehouse resolution, and quality inspection data.',
    class: 'CERTIFIED', sourceSystem: 'Coupa', targetSystem: 'SAP', businessObject: 'RECEIVING_TRANSACTION',
    version: '1.0.0', schemaPackId: 'sp_coupa_receiving_txn_v1', role: 'SOURCE',
  },
  {
    id: 'tpl_coupa_inventory_sap',
    name: 'Coupa Inventory Transaction → SAP',
    description: 'Syncs inventory balance adjustments and movements from Coupa to SAP WM/MM. Handles warehouse location mapping and lot/serial tracking.',
    class: 'CERTIFIED', sourceSystem: 'Coupa', targetSystem: 'SAP', businessObject: 'INVENTORY_TRANSACTION',
    version: '1.0.0', schemaPackId: 'sp_coupa_inventory_txn_v1', role: 'SOURCE',
  },
  {
    id: 'tpl_coupa_approval_erp',
    name: 'Coupa Approval → ERP',
    description: 'Syncs approval decisions and workflow outcomes from Coupa to ERP. Maps approval chains, delegates, and status transitions.',
    class: 'STARTER', sourceSystem: 'Coupa', targetSystem: 'ERP', businessObject: 'APPROVAL',
    version: '1.0.0', schemaPackId: 'sp_coupa_approval_v1', role: 'SOURCE',
  },
];

// Coupa as TARGET templates (SAP/ERP → Coupa)
const COUPA_TARGET_TEMPLATES: TemplateDef[] = [
  {
    id: 'tpl_sap_invoice_coupa',
    name: 'SAP → Coupa Invoice',
    description: 'Creates invoices in Coupa from SAP FI documents. Maps company code, vendor, line items, and tax information into Coupa invoice format.',
    class: 'CERTIFIED', sourceSystem: 'SAP', targetSystem: 'Coupa', businessObject: 'INVOICE',
    version: '1.0.0', schemaPackId: 'sp_coupa_invoice_v2', role: 'TARGET',
  },
  {
    id: 'tpl_sap_requisition_coupa',
    name: 'SAP → Coupa Requisition',
    description: 'Creates requisitions in Coupa from SAP purchase requisitions. Maps PR items, account assignments, and delivery schedules.',
    class: 'CERTIFIED', sourceSystem: 'SAP', targetSystem: 'Coupa', businessObject: 'REQUISITION',
    version: '1.0.0', schemaPackId: 'sp_coupa_requisition_v1', role: 'TARGET',
  },
  {
    id: 'tpl_sap_po_coupa',
    name: 'SAP → Coupa Purchase Order',
    description: 'Creates purchase orders in Coupa from SAP MM POs. Maps vendor, items, schedule lines, and confirmations.',
    class: 'CERTIFIED', sourceSystem: 'SAP', targetSystem: 'Coupa', businessObject: 'PURCHASE_ORDER',
    version: '1.0.0', schemaPackId: 'sp_coupa_purchase_order_v1', role: 'TARGET',
  },
  {
    id: 'tpl_sap_supplier_info_coupa',
    name: 'SAP → Coupa Supplier Information',
    description: 'Creates or updates Supplier Information Management records in Coupa from SAP vendor master changes.',
    class: 'CERTIFIED', sourceSystem: 'SAP', targetSystem: 'Coupa', businessObject: 'SUPPLIER_INFORMATION',
    version: '1.0.0', schemaPackId: 'sp_coupa_supplier_info_v1', role: 'TARGET',
  },
  {
    id: 'tpl_sap_supplier_coupa',
    name: 'SAP → Coupa Supplier',
    description: 'Creates or updates supplier records in Coupa from SAP vendor master. Handles address, contact, and payment term synchronization.',
    class: 'CERTIFIED', sourceSystem: 'SAP', targetSystem: 'Coupa', businessObject: 'SUPPLIER',
    version: '1.0.0', schemaPackId: 'sp_coupa_supplier_v1', role: 'TARGET',
  },
  {
    id: 'tpl_erp_lookup_coupa',
    name: 'ERP → Coupa Lookup',
    description: 'Syncs reference data tables from ERP into Coupa lookups. Maintains consistent code tables for cross-system operations.',
    class: 'STARTER', sourceSystem: 'ERP', targetSystem: 'Coupa', businessObject: 'LOOKUP',
    version: '1.0.0', schemaPackId: 'sp_coupa_lookup_v1', role: 'TARGET',
  },
  {
    id: 'tpl_erp_lookup_value_coupa',
    name: 'ERP → Coupa Lookup Value',
    description: 'Syncs reference data values from ERP into Coupa lookup values. Maps external reference codes for reporting and validation.',
    class: 'STARTER', sourceSystem: 'ERP', targetSystem: 'Coupa', businessObject: 'LOOKUP_VALUE',
    version: '1.0.0', schemaPackId: 'sp_coupa_lookup_value_v1', role: 'TARGET',
  },
  {
    id: 'tpl_sap_receipt_coupa',
    name: 'SAP → Coupa Receiving Transaction',
    description: 'Creates goods receipt records in Coupa from SAP goods movements (MIGO). Maps PO references, quantities, and warehouse locations.',
    class: 'CERTIFIED', sourceSystem: 'SAP', targetSystem: 'Coupa', businessObject: 'RECEIVING_TRANSACTION',
    version: '1.0.0', schemaPackId: 'sp_coupa_receiving_txn_v1', role: 'TARGET',
  },
  {
    id: 'tpl_sap_inventory_coupa',
    name: 'SAP → Coupa Inventory Transaction',
    description: 'Syncs inventory adjustments from SAP WM/MM into Coupa. Handles stock transfers, adjustments, and balance reconciliation.',
    class: 'CERTIFIED', sourceSystem: 'SAP', targetSystem: 'Coupa', businessObject: 'INVENTORY_TRANSACTION',
    version: '1.0.0', schemaPackId: 'sp_coupa_inventory_txn_v1', role: 'TARGET',
  },
  {
    id: 'tpl_erp_approval_coupa',
    name: 'ERP → Coupa Approval',
    description: 'Pushes approval decisions from ERP workflow engines into Coupa. Enables external approval orchestration with Coupa documents.',
    class: 'STARTER', sourceSystem: 'ERP', targetSystem: 'Coupa', businessObject: 'APPROVAL',
    version: '1.0.0', schemaPackId: 'sp_coupa_approval_v1', role: 'TARGET',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════
export async function seedCoupaSchemas(prisma: PrismaClient) {
  console.log('\n🔗 Seeding Coupa schema packs & templates...');

  // ── 1. Upsert all 10 Coupa schema packs ────────────────────────────────────
  for (const sp of COUPA_SCHEMA_PACKS) {
    // Check if schema pack already exists
    await prisma.schemaPack.upsert({
      where: { id: sp.id },
      update: {
        name: sp.name,
        system: sp.system,
        object: sp.object,
        version: sp.version,
        fields: {
          deleteMany: {},
          create: sp.fields,
        },
      },
      create: {
        id: sp.id,
        name: sp.name,
        system: sp.system,
        object: sp.object,
        version: sp.version,
        fields: {
          create: sp.fields,
        },
      },
    });
    console.log(`  ✓ Schema pack: ${sp.name} (${sp.fields.length} fields)`);
  }

  // ── 2. Upsert Coupa-as-source templates ────────────────────────────────────
  for (const tpl of COUPA_SOURCE_TEMPLATES) {
    // Skip the existing Coupa Invoice → SAP template (it's already in main seed)
    if (tpl.id === 'tpl_coupa_invoice_sap_v1') {
      // Just bind the v2 schema pack to the existing template version
      const existingVersion = await prisma.templateVersion.findFirst({
        where: { templateDefId: tpl.id, isLatest: true },
      });
      if (existingVersion) {
        await upsertSchemaPackBinding(prisma, existingVersion.id, tpl.schemaPackId, tpl.role);
        console.log(`  ✓ Bound ${tpl.schemaPackId} as ${tpl.role} to existing ${tpl.name}`);
      }
      continue;
    }
    await upsertTemplateWithBinding(prisma, tpl);
  }

  // ── 3. Upsert Coupa-as-target templates ────────────────────────────────────
  for (const tpl of COUPA_TARGET_TEMPLATES) {
    await upsertTemplateWithBinding(prisma, tpl);
  }

  console.log('  ✅ Coupa schema packs & templates complete.\n');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function upsertTemplateWithBinding(prisma: PrismaClient, tpl: TemplateDef) {
  const existing = await prisma.templateDefinition.findUnique({ where: { id: tpl.id } });
  if (!existing) {
    await prisma.templateDefinition.create({
      data: {
        id: tpl.id,
        name: tpl.name,
        description: tpl.description,
        class: tpl.class as 'CERTIFIED' | 'STARTER',
        sourceSystem: tpl.sourceSystem,
        targetSystem: tpl.targetSystem,
        businessObject: tpl.businessObject as never,
      },
    });
  }

  // Ensure template version exists
  const existingVersion = await prisma.templateVersion.findUnique({
    where: { templateDefId_version: { templateDefId: tpl.id, version: tpl.version } },
  });
  let versionId: string;
  if (existingVersion) {
    versionId = existingVersion.id;
  } else {
    const ver = await prisma.templateVersion.create({
      data: {
        templateDefId: tpl.id,
        version: tpl.version,
        workflowStructure: EIGHT_BOX_WORKFLOW,
        isLatest: true,
        publishedAt: new Date(),
      },
    });
    versionId = ver.id;
  }

  // Bind schema pack
  await upsertSchemaPackBinding(prisma, versionId, tpl.schemaPackId, tpl.role);
  console.log(`  ✓ Template: ${tpl.name} → ${tpl.schemaPackId} (${tpl.role})`);
}

async function upsertSchemaPackBinding(
  prisma: PrismaClient,
  templateVersionId: string,
  schemaPackId: string,
  role: string,
) {
  const existing = await prisma.schemaPackBinding.findUnique({
    where: {
      templateVersionId_schemaPackId_role: {
        templateVersionId,
        schemaPackId,
        role,
      },
    },
  });
  if (!existing) {
    await prisma.schemaPackBinding.create({
      data: { templateVersionId, schemaPackId, role },
    });
  }
}
