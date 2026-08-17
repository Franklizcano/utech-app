# CHANGELOG

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