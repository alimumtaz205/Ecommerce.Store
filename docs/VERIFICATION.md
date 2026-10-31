# Verification record — 30 October 2026

Passed against the supplied original Batch Tracker schema/source and disposable MySQL 8.4:

- Angular production browser + Node SSR compilation, zero compiler errors or Angular warnings.
- .NET Commerce API build, zero warnings/errors.
- 7 frontend unit checks: malformed storage recovery, cart bounds/deduplication, removal of personal/price fields from persisted cart, 30-line limit, staff-only token attachment, 401 session expiry/loading cleanup, useful validation/network errors.
- 83 HTTP integration checks plus assertions: real original operational receipt/batch/quality/pack workflow; admin-only CMS; JWE; private/draft media; public catalogue; exact pack allocations; server quote; accepted policy revision; order idempotency and changed-payload rejection; private lookup with wrong-code rejection; hold-blocked shipment; linked legacy dispatch; COD collection; cancellation; pending expiry; stock return/reconciliation; concurrent oversell prevention; unpublished product/media visibility; stale edit conflicts; wrong price/policy conflicts; documentary/consent check; Operator denied admin; spoofed SVG upload rejected; enquiry validation; actual live Angular SSR product HTML/JSON-LD; same-origin API proxy and sitemap.
- npm audit --omit=dev: zero reported production dependency advisories at check time. This is not an independent security audit.
- All five legacy integration files match original source bytes; see legacy-integration-hashes.json. Original backend source was not changed.
- Browser inspection: desktop homepage, correct full original logo, original illustrative food hero, wholesale required-field validation, and unauthenticated staff navigation redirect. Production compiled files were used.

Not verified in a live browser: authenticated CMS save/checkout against a running backend, real mobile/tablet viewport interaction and every customer journey. The managed browser preview could serve compiled UI but could not host this .NET runtime; live API/SSR workflows were tested separately in one process network. The preview intentionally returned503 for API operations; no fake business data was substituted. Responsive CSS includes desktop/tablet/mobile layouts; do the device acceptance checks below before launch.

Not performed: load/penetration testing, real domain deployment, carrier service/delivery, business policy approval, genuine product safety/export approvals, email or online payment (not included), production backup restore and multi-instance operations. User chose cash on delivery.

## Repeat automated checks

From frontend: npm ci; npm test; npm run build. From root: dotnet build Nutragea.Store.sln.

`tests/integration.py` is a Linux disposable integration harness. It needs Python3, an existing original backend source checkout (restored/buildable), and runtime directories containing dotnet/, mysql/, and optional libs/usr/lib/x86_64-linux-gnu. Set NUTRAGEA_QA_RUNTIME_ROOT and NUTRAGEA_QA_TRACKER_ROOT to those actual directories, then run python3 tests/integration.py. It starts its own NEW root/no-password local MySQL on3399, uses random ephemeral JWE keys/admin password, migrates original schema001 and commerce101, starts APIs5291/5292 and SSR4399, creates explicitly synthetic records and shuts processes down. Use only isolated development machines with those ports free. It does not target or clean your configured production database. Synthetic policies/products are never packaged as site seed data. Runtime binaries are not included.

## Manual device and launch acceptance

On 360/390px mobile, 768px tablet and desktop: open navigation; verify visible logo and no page overflow; follow every public link; search/filter/sort/page shop; select pack and quantity; change/remove cart lines; refresh cart; use a disabled/unpublished variant; validate all fields; submit a real staging COD checkout; save private code; track with correct/wrong code; refresh confirmation and verify safe recovery message. Inspect browser console for runtime exceptions (API failures should be shown as error states).

Sign in as Admin, create/edit/unpublish product, variant/category, story/programme/event/policy and media, check optimistic conflict, allocate/return stock, confirm/ship/deliver/cancel orders, read/set enquiry status, update shipping/settings, expire session and sign out. Use a held lot and competing warehouse/store orders. Confirm stock from both warehouse and allocation views. Ensure your real policy text and delivery coverage match actual operations before enabling checkout.

## Optional demo seed

Added Development-only `--seed-demo`: three published/featured dummy products, 250g variants, explicit demonstration pricing and shared illustrative media. It creates no stock, receipts, quality approvals or reservations and leaves checkout settings unchanged. Re-running skips existing demo product slugs and reuses its media record.

Demo seed verified against disposable MySQL: two successive runs produce exactly three featured products, one reused media record and zero available demo packs. Full integration suite passes 83 HTTP checks after seeding. Backend build passes with zero warnings/errors.
