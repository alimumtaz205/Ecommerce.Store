# Inventory contract

Commerce shares the existing MySQL `mutation_guard` lock with Batch Tracker. Every stock mutation uses the same serialized transaction boundary. No legacy source file is patched.

An allocation subtracts packs from `packaging_lots.available_packs`, records a negative `StoreAllocation` movement, and puts them in `s_allocations.quantity`. Physically identify these packs as website stock. Batch Tracker's warehouse balance now intentionally excludes them. Available store stock is allocation quantity minus reserved, restricted to active products, released batches and nonexpired lots.

Checkout reserves these allocated packs in earliest-best-before order. It never increases/decreases the original lot balance. Cancelling or expiring an unshipped order releases the allocation reservation. Returning UNRESERVED allocation packs adds them back to the original warehouse and records a positive movement.

Shipping rechecks quality/expiry/product/customer state, consumes reserved allocations, creates a real legacy dispatch and dispatch_items, and records a zero-quantity reclassification movement. Original lot stock was already subtracted when allocated: shipping does not subtract it again. Existing lot traceability sees this dispatch. Delivery records COD as Collected; only mark it after actual delivery/collection evidence.

Example: warehouse 60, allocate 40 -> warehouse 20/store 40. Reserve 2 -> warehouse 20/store 38 available +2 reserved. Ship 2 -> warehouse 20/store 38. Return 8 unreserved -> warehouse 28/store 30. Total remaining packs 58; two dispatched. Review both warehouse and store allocation balances when reconciling total stock. Existing warehouse-only stock reports are not expanded by this separate project.

Pending orders default to a 60-minute hold (`Commerce:ReservationMinutes`, allowed 5–1440); a background job and quote requests expire old reservations. Confirmed orders do not expire automatically. Confirm only after manual COD/address checks. Held/expired stock cannot ship; cancel affected orders or resolve quality through the existing authorised process. A batch-wide hold removes its available allocations from public availability immediately.

No edits/deletions of allocation mappings, order lines or policy snapshots are exposed. Do not modify the underlying database manually in normal operations. Use allocation return, product unpublish, variant/category deactivate and audited order transitions. Do not bypass operational authorizations.
