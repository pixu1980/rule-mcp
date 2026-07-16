# Manual QA Checklist

## Core flows

- **[FLOW_1]**
- **[FLOW_2]**
- **[FLOW_3]**
- **[FLOW_4]**

## Rules and reference data

- Create or activate a valid **[DOMAIN_ENTITY_MANAGER]** and verify the app accepts it
- Try an invalid or incomplete **[DOMAIN_ENTITY_MANAGER]** and verify the validation error is readable
- If import/export exists, verify the exported payload can be reused safely

## Data persistence

- Reload the app and verify data is still present
- Export a full backup and re-import it with replace mode
- Export a full backup and re-import it with merge mode

## Accessibility and resilience

- Navigate core flows with keyboard only
- Trigger one validation error and verify recovery guidance is clear
- Confirm the active rules or policy context is understandable to the user
- Verify no unexpected console errors during the main journey

## Edge cases

- **[EDGE_CASE_TEST_1]**
- **[EDGE_CASE_TEST_2]**
- **[EDGE_CASE_TEST_3]**
