# Nutragea official website & COD store

Angular public website, staff CMS, and separate controller-based .NET Commerce API. Forest green, ivory and muted gold match the Batch Tracker theme. The supplied full leaf/wordmark logo is retained unchanged. This project does not modify your existing Batch Tracker source or endpoints.

## Start here — Windows CMD, no PowerShell

Requirements: Node 24 LTS, .NET 10 SDK, Visual Studio with .NET 10 support, MySQL 8, and your existing working Nutragea Batch Tracker database/admin account. Extract into a short writable path such as `D:\Nutragea.Store`.

1. Back up your existing database. Test first on a restored development copy. Commerce adds `s_*` tables and integrates with existing operational tables; it needs schema 001 from your original backend.
2. Open `Nutragea.Store.sln` in Visual Studio. Set `Nutragea.Commerce.Api` as startup project.
3. The API uses the same user-secrets ID as the existing backend (`Nutragea-BatchTracker-Local`). On the same Windows account your existing local MySQL/JWE secrets are reused. If you used environment variables instead, set them in this CMD session, using your EXISTING values; never generate different JWE keys for the two APIs:

```cmd
cd /d D:\Nutragea.Store
set ASPNETCORE_ENVIRONMENT=Development
set "ConnectionStrings__MySql=Server=localhost;Port=3306;Database=YOUR_EXISTING_DATABASE;User ID=YOUR_USER;Password=YOUR_PASSWORD;SSL Mode=Preferred"
set "Jwt__SigningKeyBase64=YOUR_EXISTING_SIGNING_KEY"
set "Jwt__EncryptionKeyBase64=YOUR_EXISTING_ENCRYPTION_KEY"
dotnet restore Nutragea.Store.sln
dotnet run --project backend\Nutragea.Commerce.Api --no-launch-profile -- --migrate
```

Run migration 101 ONCE. If interrupted, restore the backup before retrying: MySQL DDL is not transactional. Alternatively execute `database/101_commerce.sql` once in MySQL Workbench with your existing database selected. Do not run the original schema 001 on your existing database. No new administrator needs to be created.

4. Trust the local development certificate, then start the API:

```cmd
dotnet dev-certs https --trust
dotnet run --project backend\Nutragea.Commerce.Api
```

Swagger: `https://localhost:7280/swagger`. Keep this terminal open. In a second CMD window:

```cmd
cd /d D:\Nutragea.Store\frontend
npm ci
npm start
```

Open `http://127.0.0.1:4300`. Staff login: `/staff/login`, using your existing Admin credentials. Public catalogue and CMS initially contain no invented products/prices/photos. Planned programme descriptions express your stated aims. Policy pages start as drafts and checkout starts disabled.

If API startup reports missing secrets, use Visual Studio **Manage User Secrets** on the API and copy the exact `ConnectionStrings` and `Jwt` sections from your working backend configuration. Never put production secrets in appsettings.json or Angular environment files. If port 7280 conflicts, update `launchSettings.json` and `frontend/proxy.conf.cjs` together. Development proxy certificate bypass is limited to the local ng-serve proxy, not the production SSR server.

## Activate the real store

1. **Media:** upload your real product photographs, accurate alternative text and confirmed usage rights. Training/community photographs also need documentary status and appropriate consent. The generated homepage food still life is labelled illustrative and is not a training photograph or proof of your inventory.
2. **Products:** add product descriptions, origin, ingredients, allergens and storage information. Map each to an existing operational product. Publish only accurate information. Mark selected products Featured to show them on the homepage.
3. **Variants:** add actual pack size, unique SKU and your real PKR selling price. Product mapping and variant weight are immutable after creation to preserve historical stock integrity.
4. In Batch Tracker prepare and quality-release packaged lots. In **Allocations**, move the required packs into the storefront. The lot product and pack weight must exactly match the variant. See `docs/INVENTORY.md` before allocating physical stock.
5. **Content:** publish your approved shipping, returns, privacy and terms pages using the existing four policy records/slugs. Publish genuine stories/events and update planned programme statuses as activities take place. A Page with slug `about` adds editable company text to `/about`; other Pages are available at `/pages/slug`.
6. **Shipping:** add real Pakistan delivery options/charges. A shipping option is a customer-selected service; the present API does not validate postcode coverage, so only enable a service covering the Pakistan addresses you accept. International buyers use the wholesale/export enquiry form; there is no international checkout.
7. **Settings:** enter the real support email and business address, enable COD and then checkout. The API refuses activation until policies and shipping exist.
8. Place a low-value real acceptance order before opening publicly. Confirm the address/service manually, confirm stock, ship, and record delivery/COD collection. Staff status changes require a reason and are audited.

## Included features

- SSR public home, catalogue/search/categories/sort/pagination, product details/gallery and actual prices/availability.
- About, programme pages, stories/events/gallery, contact and wholesale enquiry forms backed by MySQL.
- Persistent cart containing only variant IDs/quantities; server-priced quote, policy revision acceptance, COD checkout, private guest order lookup.
- Staff CMS: products, variants, categories, allocations/returns, order fulfilment, enquiries, approved media, shipping and settings. Soft unpublish/deactivate is used instead of destructive deletion.
- Existing JWE staff authentication, in-memory token, route guard, session expiry, admin-only API authorization, optimistic editing versions, validation, loading/empty/error states and toast notifications.
- Self-hosted fonts/icons, responsive navigation/tables/forms, canonical/social metadata, real product JSON-LD, sitemap and robots.

## Structure

```text
backend/Nutragea.Commerce.Api/   Controllers, contracts, services, copied legacy auth/data integration
frontend/src/app/core/          Typed API, cart, auth, HTTP, checkout and SEO services
frontend/src/app/features/      Public pages and commerce flows
frontend/src/app/admin/         Staff CMS, forms and media
frontend/src/app/shared/        Shared product card, currency formatting and UI imports
frontend/public/assets/        Original logo and labelled editorial food image
database/101_commerce.sql       Additive commerce schema
frontend/dist/nutragea/         Verified browser + Node SSR production build
docs/                          Inventory, API, deployment, assets and verification
tests/                         Reproducible integration harness and test result
```

## Build and test

```cmd
dotnet build Nutragea.Store.sln
cd frontend
npm test
npm run build
```

For local built SSR, use the API's HTTP-only loopback profile so Node does not need your self-signed development certificate (development only):

```cmd
set ASPNETCORE_ENVIRONMENT=Development
dotnet run --project backend\Nutragea.Commerce.Api --no-launch-profile --urls http://127.0.0.1:5280
```

In a second window from `frontend`:

```cmd
set SSR_API_ORIGIN=http://127.0.0.1:5280
set PUBLIC_ORIGIN=http://localhost:4000
set PORT=4000
npm run serve:ssr
```

Open `http://localhost:4000`. Public production domain/SEO values require configuration and a rebuild; see `docs/DEPLOYMENT.md`. Do not deploy Angular browser files alone if you need SSR, proxy, sitemap and robots behaviour.

## Boundaries

This release implements guest COD checkout for Pakistan. No online payment, customer account/password system, automatic email, courier integration, tax engine, discounts, donation collection, refunds or post-shipment returns processing is claimed. Handle returns through support and your approved policy. Order confirmation provides a private access code; customers must save it before leaving/reloading. Neither the code nor customer address is persisted in browser storage. If an order POST outcome is uncertain, retry the unchanged form in the same page session; do not refresh and order again before staff checks for duplicates. Pending stock reservations expire after 60 minutes by default. Confirmed orders require staff fulfilment/cancellation.

Categories may include oils, tea, grains and handicrafts, but current sellable stock must be represented by a valid packaged lot supported by your existing operational system. A category alone does not add a new manufacturing process. Product approvals, truthful claims, real policy text, destination requirements and operational acceptance remain business responsibilities; the site does not claim NGO registration, certifications, achieved impact or medical benefits.

## Optional dummy catalogue: apricot, walnut and almond

Use only your development database after migration101. Stop the Commerce API, then run in Windows CMD from the extracted project root:

```cmd
set ASPNETCORE_ENVIRONMENT=Development
dotnet run --project backend\Nutragea.Commerce.Api --no-launch-profile -- --seed-demo
dotnet run --project backend\Nutragea.Commerce.Api
```

Reload the shop/homepage. This adds three published, featured DEMO products with 250g variants: dried apricots PKR650, walnut kernels PKR950, almonds PKR850. These are arbitrary demonstration prices. All use the labelled illustrative food image. Running again skips existing demo slugs without resetting edits. Demo operational product mappings are separately named [DEMO]; no real products are overwritten. Stock remains zero, so these dummy products cannot be purchased. No synthetic receipts, safety approvals or lots are created. Unpublish the three samples before launch and create your real mapped products instead. Production environment refuses this command; never run it against a live database using Development mode.
