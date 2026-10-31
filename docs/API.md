# Commerce API contract

Development OpenAPI: https://localhost:7280/swagger. Prefix `/capi`; standard ASP.NET validation ProblemDetails; business conflicts 409; missing/private order mismatch 404; authentication 401/authorization 403; rate limit 429. ISO dates use UTC; UI event dates display Asia/Karachi. MySQL public entities retain snake_case fields; computed DTOs use camelCase. See strongly typed `frontend/src/app/core/models.ts` and server contracts for exact types.

Public:
- GET settings, categories, products (`search`, `category`, `sort`, `page`, `pageSize`, `featured`), products/{slug}
- GET content (`type`), content/{slug}, media/{randomFileName}, sitemap
- POST cart `{items:[{variantId,quantity}]}` resolves current visibility, stock and price; stale/unpublished item has null price and zero availability
- POST quote `{items,shippingId}` returns items/subtotal/shipping/discount/total/currency/policyRevision
- POST orders `{requestId,items,shippingId,name,email,phone,address,city,postalCode,countryCode:'PK',expectedTotal,acceptTerms,expectedPolicyRevision}` -> 201 reference/accessCode/total/currency/status. UUID idempotency key: exact retry returns original secret/result; changed payload409. Server computes every monetary value and validates current policy revision.
- POST orders/lookup `{reference,accessCode}` -> minimal private order status/items/totals; access code never appears in a URL
- POST enquiries `{type:'Contact'|'Wholesale',name,email,message,business?,country?,products?,quantity?,website?}`. Wholesale requires business/country/products/quantity. Website is an empty honeypot.

Staff auth: POST auth/login `{username,password}`, GET auth/me, POST auth/logout. Same encrypted JWE keys/issuer/audience and DB sessions as Batch Tracker; no refresh token. `/admin/*` requires Admin. Browser tokens stay in memory.

Admin:
- GET settings, PUT settings (version required)
- GET {products|variants|categories|content|shipping|enquiries|media|orders|allocations|operational-products|lots}?page=1 -> items/hasMore/page, at most100/page
- POST products/variants/categories/content/shipping; PUT corresponding collection/{id}. Exact DTOs in Contracts/CommerceRequests.cs; version required on updates.
- POST allocations `{variantId,lotId,quantity}`, POST allocations/{id}/release `{quantity}`
- GET orders/{id} returns address, items, accepted policy snapshot and chronological events; POST orders/{id}/actions `{action:'Confirm'|'Cancel'|'Ship'|'Deliver',reason}`; POST orders/expire
- PUT enquiries/{id} `{status:'New'|'Handled'}`
- POST media multipart: file, alt, rightsConfirmed, consentConfirmed, isDocumentary. Only structurally validated PNG/JPEG <=5MiB. Metadata is stripped; random storage names, no SVG or executable uploads. GET media/{id}/preview requires Admin. Public media route serves only images referenced by published content/products.

Pricing currency PKR. Decimal prices/charges require two places; pack weights use three. Stock max quantity100/line, max30 distinct variants/order. CMS limits are enforced server-side. There are no guessed Batch Tracker ecommerce endpoints: this separate API adds them explicitly.
