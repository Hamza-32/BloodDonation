# Requirements and implementation decisions

Both supplied PDFs were read in full (9 pages of feature test cases and 4 pages of UML documentation); the class diagram on page 2 was also rendered and inspected before implementation.

## Product scope

The source concept is a **blood donation coordination portal**. It models five roles: donor, patient, administrator, hospital, and blood bank. Requests carry a blood group, quantity, location, date, owner, and status. Hospitals coordinate and verify donations; blood banks own inventory with batch quantities and expiration dates. Feedback and ratings support donor experiences. The public product is called Donation Portal.

The generic fundraising suggestions in the implementation brief are adapted to blood units. Introducing money, checkout, or a fake payment gateway would obscure the original concept. The implemented lifecycle is request → administrator review → donor screening → appointment pledge → receiving institution confirmation → confirmed unit progress. Failed and cancelled records are retained but do not count toward campaign totals.

## Traceability

| Source requirement                         | Implementation                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Registration/login and password validation | scrypt hashing, opaque cookie sessions, server-side Zod validation, persistent rate limiting                                   |
| Hospital/blood bank approval               | Pending registrations, administrator approval, write restrictions                                                              |
| Donor profile and screening                | Name, contact, city, blood group, birth date, weight, availability, HTTPS avatar URL, interval checks                          |
| Blood and emergency requests               | Campaign creation/editing, admin review, urgency filters, one open emergency request per owner                                 |
| Donation tracking/history/export           | Pending/completed/failed/cancelled appointments, reference IDs, protected history, CSV export                                  |
| Compatibility checker                      | Eight ABO/Rh red-cell groups; clinical screening remains mandatory                                                             |
| Donor filters                              | Blood group and city; personal contact details are private                                                                     |
| Hospitals and blood bank inventory         | Approved partner directory, expiring batches, authenticated stock issuance                                                     |
| Admin panel                                | Account access, institution approvals, campaign approvals, feedback moderation, categories, interval configuration, audit feed |
| Feedback/rating                            | One rating and comment per completed donation, admin moderation                                                                |

## Deliberate adaptations and remaining capabilities

- Database relations replace class inheritance. Authorization roles are enums rather than separate tables with duplicated user credentials.
- Generic login failures avoid revealing which accounts exist.
- Account deletion becomes deactivation to retain donation accountability. A production privacy policy and retention workflow remain future work.
- The PDFs mention a 56-day example; the local demo uses a configurable **90–180 day** interval and labels it as a portal rule rather than clinical advice.
- Medical certificate upload, MFA, password recovery, email/SMS notifications, actual hospital APIs, and automatic stock transfer are **not implemented**. They require additional identity, private document storage, notification, and operational designs. No UI implies those capabilities exist.
- Avatar support stores an HTTPS URL; file upload is not implemented. The donor profile retains it for future display integration.
- No donation payments are processed. A blood appointment is a coordination record, not a payment transaction.
- SQLite is chosen for a runnable local repository without a database service. PostgreSQL deployment requires a provider change and newly generated PostgreSQL migrations; the SQLite migration must not be reused.

## Source files

- `BG2_Blood_Donation_Portal.pdf`: ten feature suites covering authentication, donor profiles, requests, donation history/tracking, emergencies, compatibility, donor discovery, institutional integration, admin, and feedback.
- `BG2_BloodDobationPortal_Class-Diagram.pdf`: User specialization, Request, Blood Inventory, Feedback, and Ratings and their associations.

The supplied material remains preserved locally at the repository root and is excluded from Git because it contains personal identifying information. Its institutional context does not appear in the public application. Cloned repositories contain this requirements summary rather than the original private source files.
