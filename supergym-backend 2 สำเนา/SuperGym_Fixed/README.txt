SUPERGYM DATABASE - revised SQL files (MySQL 8.0.16+)

IMPORTANT: Back up any existing database. Run 01 only in a NEW EMPTY supergym database.
01_schema.sql: creates schema and 14 tables
02_sample_data.sql: adds demo data; run only once on a fresh schema
03_business_rules.sql: adds triggers/procedures for BR16/17/18/20
04_queries.sql: ten reporting queries. Query 2 is correctly labelled revenue BY PLAN, not by branch.
05_validation.sql: read-only consistency checks; all exception queries should return zero rows.

Suggested run order: 01 -> 02 -> 03 -> 04 -> 05.
Do NOT run 01 or 02 over an existing populated database.

IMPORTANT LIMITATIONS:
- BR4 (every trainer has >=1 specialization), BR12 (every membership has >=1 payment), and BR20's requirement that EVERY trainer has exactly one subtype cannot be fully enforced with these table-level triggers during multi-table creation. Use application transactions, a final validation check, and an agreed workflow.
- Concurrent booking requests can race in a count-based trigger. For production, serialize booking transactions by locking the class_session row in the application before inserting/updating a booking; likewise serialize session assignments by trainer when enforcing BR17.
- Query 2 cannot truly show branch revenue: the current membership/payment schema does not attribute payments to branches. Add an agreed branch attribution field and migrate data before claiming branch revenue.
- These files have been statically reviewed, NOT executed against a MySQL server in this environment. Run and screenshot both success and expected-error cases in MySQL Workbench.
- The sample data is intentionally small and uses fixed foreign-key IDs; insert into fresh tables only.
