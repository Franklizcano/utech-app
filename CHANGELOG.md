# CHANGELOG

### [Unreleased]
- Added order-level recurring reminders with collaborator/admin-authored messages and 6-, 12-, or 24-month intervals (12 months by default); delivery begins when the order is marked as delivered and repeats for registered clients.
- Added authenticated daily reminder processing with deduplication and per-channel delivery tracking, leaving the email-provider integration point available for later.
- Moved recurring reminder controls and internal change history into the order actions menu to reduce visual clutter.

### [0.3.0] - 2026-09-30
- Moved corporate clients out of the general user list and added a search by name, email, or phone in company management.
- Restricted corporate clients to tickets belonging to their company across authenticated order lists and ticket details, with server-side scope validation.
- Added company capacity enforcement: administrators can lower a company's member limit, and companies exceeding that limit cannot generate new tickets until their membership is regularized.
- Added explicit capacity warnings for administrators and corporate clients, while preserving regular-client and occasional-ticket creation.
- Preserved manager removal controls so removed members become regular clients without deleting their accounts.
- Added an internal, actor-aware order history that records creation, status changes, assignments, technical edits, budget operations, and client budget decisions without exposing audit data to clients.
- Added a backfill for historical timeline events and separated the internal audit trail from the client-facing repair timeline.
- Routed internal order mutations through authorized server actions with role and assignment validation, while preserving optimistic UI updates and refreshes.
- Added fixed-amount and percentage discounts to budget items with server-side limits, recalculated totals, and client-visible discount details.
- Added globally unique `CP`, `CC`, and `CO` order codes with a transaction-safe counter, date-based formatting, and normalized code searches.
- Improved notification navigation so clients and internal users can load the related ticket detail on demand even when it is not already in the current list.
- Added a dedicated `Nueva orden corporativa` action for administrators and collaborators, restricted to registered corporate clients.
- Renamed the internal `Nuevo pedido` actions and order-creation labels to `Nueva orden` for consistent terminology.

### [0.2.2] - 2026-09-15
- Refined the budget workflow from technical analysis through client decision, including server-side validation for submission, finalization, acceptance, and rejection.
- Added budget timeline events and in-app notifications when an order enters budget review, when a finalized budget is sent, and when the client accepts or rejects it.
- Made finalized budgets read-only after being sent to the client, while preserving editing for new or rejected budgets and enforcing the rule in server actions.
- Enabled clients, including corporate clients, to view finalized budgets and accept or reject them with an optional comment; the portal refreshes immediately after the decision.
- Returned rejected budgets to the budget queue and allowed them to be claimed again for revision and resubmission.
- Added recipient-aware in-app notifications with notification types, titles, priorities, read timestamps, metadata, and deduplication support for future delivery channels.
- Added a global notification bell with unread counts, individual read state, and direct navigation to the related ticket for clients and internal users.
- Added targeted notifications for clients, collaborators, and budgeters while preserving the existing public flow for occasional tickets.
- Added per-user in-app notification preferences from the profile menu, with separate controls for order updates, budgets, and assignments.

### [0.2.1] - 2026-09-14
- Added signed HS256 JWT sessions stored in secure, HTTP-only cookies, with server-side validation of session claims without querying the database on each request.
- Added scalable corporate roles with `member` and `manager`, including a single manager per company enforced by the server.
- Added corporate user management for managers: add, edit, and remove members from their company without access to change the company user quota.
- Added administrator controls to assign or revoke the company manager role from the company members dropdown.
- Completed `presupuestador` access across collaborator capabilities, including order creation, user lookup, notifications, announcements, and statistics responsibility filters, while preserving budget-management access.
- Changed administrative tabs to mount sections only when selected, preserving loading feedback for each section.
- Extended order caching to search results so repeated searches within the cache TTL do not request the database again; explicit order changes still revalidate data immediately.
- Added public ticket detail pages at `/ticket/[code]` with current status, grouped timeline updates, distinct notes, and compacted note-free dates.
- Kept public occasional-ticket access at `/ticket/[code]` for the login lookup, while `/gestion/ticket/[code]` remains the internal detail route with server-side session, role, and order-scope validation for administrators, collaborators, and budget managers.
- Updated the management workspace so selecting a ticket changes the URL without leaving the split list-and-detail view; browser back/forward navigation remains synchronized with the selected ticket.
- Added a sticky desktop detail panel, clearer selected-ticket styling, a compact ticket toolbar with copy-link actions, and a mobile close-detail control.
- Added a custom 404 page for invalid or unauthorized routes.
- Expanded the profile dropdown with profile details, pending announcements, corporate-company access, theme preferences, help, password changes, and logout.
- Moved secondary administrator sections (companies, states, announcements, and configuration) out of the main tab list and added shortcuts to them in the administrator menu.
- Fixed the administrator dropdown runtime error by placing its label and items inside the required Base UI menu group.
- Extended the public ticket lookup to search occasional orders by ticket code or equipment serial while returning only the matching code and status.
- Defaulted new internal orders to the logged-in technician when available, while keeping reassignment available for another technician.
- Redacted client names, contact details, and client identifiers from order data delivered to collaborators and budgeters; ticket views now omit the client name entirely, including placeholder labels.

### [0.2.0] - 2026-08-24
- Added configurable order expiration, with a default 30-day period managed by administrators.
- Added progressive card colors and expiration labels as orders approach or pass their expiration date.
- Added order sorting by expiration, creation date, status, and client in the operations workspace.
- Added expiration highlighting to unassigned-order and budget-order inboxes.

### [0.1.11] - 2026-08-20
- Moved pnpm dependency overrides to the workspace configuration so they are applied correctly and the package-manager warning is resolved.
- Added short-lived, session-scoped caches for administrative user and company pages, with invalidation after related changes.
- Added a short-lived cache for operational inboxes and their pending-order count, with invalidation after order assignments and budget workflow changes.
- Replaced periodic order polling with cache revalidation on tab focus and after order changes.
- Cached the authenticated announcement inbox to avoid an unrelated database request whenever the application shell mounts.

### [0.1.10] - 2026-08-17
- Add filters to statistics view.
- Added referral codes to users and added visualization to admin view.
- Add protection to structural states.

### [0.1.9] - 2026-08-12
- Adjusted code generation in order creation to include a prefix based on the client type.
- Optimized order queries to include pagination and caching.
- Fixed announcement UI.
- Adjusted orders visualization when the user login.

### [0.1.8] - 2026-08-12
- Added client search functionality in order creation view.
- Added serial field to order creation view.
- Added role filter in user management view.
- Added announcements management functionality.

### [0.1.7] - 2026-08-11
- Improved user interface.
- Added finished orders inbox.

### [0.1.6] - 2026-08-11
- Added company management functionality.
- Added company user management functionality into company management view.
- Added company user limit in corporate user management.

### [0.1.5] - 2026-08-09
- Added orders panel to registered clients.
- Added order creation to registered clients.
- Added order search in login view.
- Added order inbox to order management panel.

### [0.1.4] - 2026-08-05
- Added loader when fetching data from the database to improve user experience.
- Added deviceType to order selector.
- Added in-memory orders cache separated by user and role, with periodic and visibility-based revalidation while preserving optimistic updates.
- Restricted server-side order loading by user: clients only receive their own orders, collaborators receive orders assigned to them and modified within the last 30 days, and administrators retain access to all orders.
- Updated dependencies to fix vulnerabilities.

### [0.1.3] - 2026-08-02
- Added dropDownMenu for user, change password and logout functionality.

### [0.1.2] - 2026-07-31
- Migrate hardcoded values to database persistence.

### [0.1.1] - 2026-07-28
- Implement login and user management features.

### [0.1.0] - 2026-07-07 
- Initial release of the project.
