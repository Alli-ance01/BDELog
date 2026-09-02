# Project TODO

- [x] Inspect the current BDELog repository and referenced form-builder implementation
- [x] Define report-question categories with name, description, display order, and active state
- [x] Assign every question to a category and support position within that category
- [x] Add intuitive category and question reordering controls that update the live template sequence
- [x] Support complete question configuration: label, help text, input type, required status, select options, validation rules, conditional visibility, and active/retired state
- [x] Render the worker report form grouped and ordered by configured categories and questions
- [x] Add backend validation, routes, and persistence for category/question configuration
- [x] Add or update automated tests for category/question ordering and configuration validation
- [x] Run type/build/test checks and visually inspect the admin and worker flows
- [x] Commit and push the verified implementation to Alli-ance01/BDELog

- [x] Add the standard monthly target of 45 accounts opened and ₦8,000,000 mobilised
- [x] Calculate each worker’s month-to-date totals from submitted daily reports
- [x] Return remaining accounts and mobilisation amount after submission, including over-target values
- [x] Render a daily-updated worker progress summary with clear target and surplus states
- [x] Add tests for monthly aggregation, zero/negative remaining values, and over-target messaging
- [x] Run the full validation suite and push the monthly target update to Alli-ance01/BDELog

- [x] Add admin editing for BDE/ESO full name, branch assignment, and DAO code
- [x] Validate directory edits and preserve worker/report references when names or codes change
- [x] Reflect updated directory entries in the public worker selector and new report snapshots
- [x] Add tests for directory update validation and branch reassignment behavior
- [x] Run the full validation suite and push the directory editor update to Alli-ance01/BDELog
