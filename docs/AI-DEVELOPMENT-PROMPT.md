Act as a senior Angular architect, full-stack software engineer, ecommerce specialist, and UI/UX designer.

Design and develop the complete **Nutragea official website and ecommerce store** as one integrated website. Deliver working source code and verified functionality, not merely a design, static pages, or a development plan.

## 1. Business and mission

Nutragea is a business connected to Gilgit-Baltistan, Pakistan. We want to bring regional products to domestic and international customers while improving producer skills and local livelihoods.

Our intended activities include:

- Selling regional foods and other approved local products.
- Training growers in harvesting, handling, drying, grading, storage, and packaging.
- Reducing avoidable post-harvest losses.
- Supporting local producers and artisans.
- Arranging training sessions and awareness seminars.
- Developing education, health-awareness, and other community initiatives.

Present commercial activities and community programmes clearly within the same brand.

Do not describe Nutragea as a registered NGO, foundation, certified organic producer, or certified exporter unless supporting information is supplied. Distinguish completed activities, active programmes, and future ambitions.

Do not invent impact figures, partnerships, certifications, customer reviews, or claims that each purchase funds a programme.

## 2. Branding and visual direction

Use the **attached official Nutragea logo**:

- Preserve its lettering, leaf symbol, proportions, and identity.
- Retain the supplied “DRY FRUITS” wording unless instructed otherwise.
- Do not replace it with a generic icon, newly generated logo, or N monogram.
- Use the actual image asset with suitable sizing and object-fit.
- If excess canvas whitespace needs trimming, preserve the artwork and provide an optimized derivative alongside the original.
- Do not fake transparency through a filter that damages the logo.

Match the existing Nutragea Batch Tracker theme:

- Deep forest green: `#173F35`
- Dark forest green: `#12372E`
- Warm ivory: `#F7F7F2`
- White surfaces: `#FFFFFF`
- Copper accent: `#A47549`
- Text: `#243B33`
- Secondary text: `#626F60`
- Borders: `#E5E8DF`

Use Manrope for interface text and Newsreader for selected editorial headings, where licensing permits. Self-host fonts and icons.

The public website should feel like a premium food and regional-lifestyle brand. Reuse the software’s identity without copying its administrative dashboard layout.

Use generous but balanced spacing, readable text, strong photography, subtle borders, restrained shadows, and consistent buttons. Avoid excessive gradients, oversized banners, autoplay carousels, intrusive popups, and decorative animation.

Design for mobile first.

## 3. Inspect existing software before implementation

Inspect the supplied Angular and .NET projects, including routes, DTOs, authentication, authorization, database relationships, and operational workflows.

The existing Batch Tracker manages:

- Growers and products.
- Fruit receipts.
- Processing batches.
- Quality decisions.
- Packaging lots.
- Dispatches.
- Inventory and traceability.
- Staff authentication and access.

It is not an existing ecommerce or CMS backend.

Do not assume its product records include retail descriptions, prices, photographs, variants, shipping details, or storefront availability.

Create a concise contract and gap map identifying:

1. Existing capabilities that can safely be reused.
2. New commerce and content capabilities required.
3. Integration points with operational inventory.
4. Missing external configuration or business information.

Preserve existing working workflows. Add new capabilities through a clearly separated commerce/CMS layer with versioned migrations and documented interfaces. Do not silently change existing stock calculations or authentication behavior.

## 4. Technology and architecture

Use:

- The latest stable Angular version compatible with the selected dependencies, verified at implementation time.
- Standalone components and lazy-loaded routes.
- Angular Router, Reactive Forms, HttpClient, and RxJS.
- Angular Material for appropriate interactive controls and administrative screens.
- Material icons.
- ngx-toastr or another explicitly justified compatible Toastr integration.
- SCSS and reusable design tokens.
- ASP.NET Core controller-based APIs and MySQL for required new backend capabilities, consistent with the existing stack.

Use Angular SSR or prerendering where appropriate for public content and product SEO. Keep customer-specific data out of public caches and transferred page state.

Separate storefront, customer account, and staff administration concerns. Prefer a maintainable modular application over unnecessary microservices.

Do not force incompatible packages or use unsupported versions to make installation succeed.

## 5. Public website structure

Implement these sections:

### Home

Include:

- A clear brand introduction and product-focused hero.
- “Shop products” and “Discover our purpose” calls to action.
- Featured products and categories from published catalogue data.
- A concise company story.
- Published training/community stories.
- A wholesale/export enquiry invitation.

Show testimonials or impact statistics only when approved records exist.

### Shop

Provide:

- Product categories.
- Search, sorting, filtering, and pagination.
- Product cards with real price, pack size, availability, and imagery.
- Responsive loading, empty, and failure states.

Initial catalogue categories may include dried fruit, nuts, oils, teas/herbs, and grains. Handicrafts can be a separate category when actual products are available.

Do not publish products automatically merely because a Batch Tracker product exists.

### Product details

Support:

- Product title and image gallery.
- Description and origin information.
- Pack-size or variant selection.
- Price and availability.
- Quantity controls and add-to-cart.
- Ingredients, allergens, storage, and relevant product information.
- Delivery/returns information.
- Related published products.

Use validated product-specific content. Do not generate medical or unsupported nutrition claims.

Treat oils, botanical teas, and shilajit as products requiring their own approved specifications and descriptions.

### Our Story

Include supplied company background, purpose, values, and regional connection. Publish team details only when provided.

### Our Impact

Provide programme pages for:

- Farmer training and product quality.
- Local livelihoods.
- Awareness seminars.
- Education initiatives.
- Health-awareness initiatives.

Each programme must show its actual status. Do not present planned work as completed.

### Stories and Events

Support articles, training reports, event information, photographs, captions, dates, and categories.

Use consent-approved photographs. Never represent generated images as documentary evidence of real training or community work.

### Wholesale and Export

Include a functional enquiry form covering business name, country, contact details, products, approximate quantities, and message.

Present international enquiries as enquiries until fulfilment eligibility is confirmed. Do not claim worldwide delivery or export approval without verification.

### Contact and Policies

Include functional contact enquiries and editable pages for:

- Shipping and delivery.
- Returns and refunds.
- Privacy.
- Terms.
- Product/allergen information where appropriate.

Do not invent addresses, phone numbers, legal policies, or commercial commitments. Identify missing information and keep affected content unpublished until approved.

## 6. Ecommerce functionality

Implement:

- Persistent guest cart containing product/variant IDs and quantities, without sensitive customer data.
- Quantity updates, removal, and clear-cart actions.
- Guest checkout.
- Customer contact and address collection.
- Delivery eligibility and server-calculated shipping.
- Backend-calculated prices, discounts, and order totals.
- Order placement, confirmation, and secure order lookup.
- Customer order history if customer accounts are implemented.
- Staff order management and fulfilment states.

A public order number alone must not grant access to private order information.

Make customer accounts optional for purchasing unless a concrete business requirement says otherwise. Customer identities must never receive staff roles.

Use domestic Pakistan fulfilment as the initial configurable scope. International purchasing must follow configured shipping, payment, and product eligibility; otherwise direct visitors to wholesale enquiries.

Use a configured base currency. Do not imply multi-currency settlement through a display-only conversion.

## 7. Inventory integration

Design a reliable relationship between:

- Operational products.
- Storefront products and variants.
- Packaging lots.
- Stock reservations.
- Orders.
- Dispatches.

Prevent overselling, duplicate orders, duplicate dispatches, and double stock deductions.

Define when stock is reserved, released, and consumed. Handle unpaid, cancelled, failed, and expired orders consistently.

Do not let a shopping cart reserve stock indefinitely.

Recheck quality disposition and sellable availability before fulfilment. A newly held lot must not remain dispatchable because an older availability result was cached.

Use transactions and idempotency for critical operations. Document how commerce fulfilment invokes or maps to the existing dispatch workflow.

## 8. Payments

Implement a payment-provider abstraction and integrate a selected provider only after verifying its actual documentation and merchant requirements.

If approved by the business, support cash on delivery as a separate order workflow.

For online payments:

- Calculate payable amounts on the server.
- Use hosted/tokenized payment facilities.
- Verify webhook authenticity.
- Handle duplicate and out-of-order callbacks.
- Reconcile payment status server-side.
- Never mark an order paid based only on a browser redirect.
- Never store raw card details.

Keep secrets server-side. Supply configuration templates without credentials.

If merchant credentials or account approval are unavailable, provide an isolated sandbox integration and clearly identify live activation as a blocker. Do not label simulated payment success as production-ready checkout.

## 9. Content and commerce administration

Provide protected staff interfaces to manage:

- Storefront products, variants, prices, images, and publication.
- Categories and featured content.
- Orders and fulfilment.
- Shipping configuration supported by the implementation.
- Articles, programmes, events, and galleries.
- Enquiries and their handling status.
- Approved company and policy content.

Support draft/published states and preview where appropriate.

Separate content-management permissions from customer access. Reuse existing staff authentication only through verified, documented integration.

Never expose staff JWE keys, private operational endpoints, internal purchase costs, grower contacts, or customer records through public catalogue responses.

## 10. Security and privacy

Implement:

- Server-side authentication and authorization.
- Appropriate rate limiting and form-abuse protection.
- Server-side validation and parameterized database access.
- Safe rendering and sanitization of rich content.
- Protected media uploads with file-type, size, and storage controls.
- Secret-free frontend configuration.
- Secure customer session handling.
- CSRF protection when cookie authentication is used.
- Clear expiry, logout, and permission-denied behavior.
- Safe errors with trace references.
- Audit records for sensitive administrative changes.

Never store payment details, passwords, or signing/encryption keys in browser storage.

Apply publication and consent controls to programme photographs, especially photographs involving children. Avoid collecting unnecessary personal information.

Do not add donations or fundraising checkout by default. Those require a separate approved operational and legal setup.

## 11. SEO, accessibility, and performance

Implement:

- Unique page titles and descriptions.
- Canonical URLs.
- Sitemap and robots configuration.
- Open Graph metadata.
- Accurate product/article structured data.
- Crawlable public content.
- Optimized responsive images and lazy loading.
- Reserved image dimensions to reduce layout shifts.
- Meaningful headings, alt text, labels, and keyboard interactions.
- Visible focus states and accessible dialogs.
- Sufficient contrast and reduced-motion support.

Target WCAG 2.2 AA practices and document verification limits. Do not claim certification without an audit.

Do not place fake reviews, prices, stock, or certification claims in structured data.

## 12. Delivery and verification

Deliver:

1. Complete Angular source and lockfile.
2. Required new controller-based backend code and migrations.
3. API contracts and an integration guide.
4. Storefront, customer, and staff functionality.
5. Theme assets and the supplied official logo.
6. Environment templates without secrets.
7. Windows CMD installation and running instructions.
8. Production build and hosting configuration.
9. Tests and a validation report.
10. A clear list of external activation requirements.

Verify:

- Production builds and TypeScript compilation.
- Supported create/edit/publication workflows.
- Cart and checkout calculations.
- Stock conflicts and reservation expiry.
- Order/payment idempotency.
- Authentication and authorization.
- Content publication and media handling.
- Deep-link navigation and SEO output.
- Mobile, tablet, and desktop behavior.
- Loading, empty, and failure states.
- Browser console errors.

Use synthetic data only in clearly isolated development/test fixtures. Never publish it as genuine customers, community activities, reviews, or business results.

Record which checks actually passed, which were not run, and which require real provider credentials or infrastructure. Never invent test results.

Begin by inspecting the supplied projects and assets. Then implement the agreed single-website architecture, progressing through a complete shopping and publishing journey. Ask only for information that blocks a concrete next step, and continue independent work while awaiting it.