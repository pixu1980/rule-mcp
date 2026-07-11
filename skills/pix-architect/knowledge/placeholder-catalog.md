# Placeholder Catalog

## Project Identity
| Placeholder | Type | Example | Used In |
|---|---|---|---|
| `[PROJECT_NAME]` | string | "TaskFlow" | All specs |
| `[PROJECT_DESCRIPTION]` | sentence | "help teams organize work" | project-context, 00-sdd |
| `[PROJECT_ELEVATOR_PITCH]` | sentence | "A simple task manager for freelancers" | 01-product |

## Domain
| Placeholder | Type | Example | Used In |
|---|---|---|---|
| `[DOMAIN_NAME]` | string | "Task Management" | project-context, 00-sdd |
| `[DOMAIN_TERM_1]` | string | "task" | 02-glossary, project-context |
| `[DOMAIN_TERM_2]` | string | "project" | 02-glossary |
| `[DOMAIN_ENTITY_MANAGER]` | string | "board" | 02-glossary, 05-architecture |
| `[DOMAIN_LOGIC_AREA]` | string | "scheduling" | 00-sdd, 03-calculation |
| `[DOMAIN_CONSTRAINT_1]` | string | "local-first, no cloud" | 00-sdd |
| `[DOMAIN_CONSTRAINT_2]` | string | "offline-capable" | 00-sdd |
| `[DOMAIN_NOTE_1]` | sentence | "Tasks can be recurring" | 00-sdd |
| `[DOMAIN_NOTE_2]` | sentence | "Projects have deadlines" | 00-sdd |
| `[DOMAIN_NOTE_3]` | sentence | "Tags are free-form" | 00-sdd |
| `[DOMAIN_NOTE_4]` | sentence | "Archived after 90 days" | 00-sdd |
| `[DOMAIN_DATA_PRINCIPLE_1]` | string | "immutable history" | 05-architecture |

## Entities
| Placeholder | Type | Example | Used In |
|---|---|---|---|
| `[PRIMARY_ENTITY]` | string | "Task" | project-context, 02-glossary, 05-architecture |
| `[SECONDARY_ENTITY]` | string | "Project" | project-context, 02-glossary, 05-architecture |
| `[ENTITY_1]` | string | "Tag" | 02-glossary |
| `[ENTITY_2]` | string | "Comment" | 02-glossary |
| `[ENTITY_3]` | string | "Attachment" | 02-glossary |
| `[ENTITY_4]` | string | "RecurrenceRule" | 02-glossary |

## Personas
| Placeholder | Type | Example |
|---|---|---|
| `[USER_PERSONA]` | string | "Freelancer" |
| `[PERSONA_1]` | string | "Freelancer" |
| `[PERSONA_1_DESC]` | sentence | "Works independently on multiple projects" |
| `[PERSONA_2]` | string | "Team Lead" |
| `[PERSONA_2_DESC]` | sentence | "Coordinates work across team members" |
| `[PERSONA_3]` | string | "Client" |
| `[PERSONA_3_DESC]` | sentence | "Reviews progress and provides feedback" |

## Features & User Stories
| Placeholder | Type | Example |
|---|---|---|
| `[FEATURE_1]` | string | "Create and edit tasks" |
| `[FEATURE_2]` | string | "Organize into projects" |
| `[FEATURE_3]` | string | "Track time spent" |
| `[KEY_VALUE_PROP_1]` | string | "Simple drag-and-drop scheduling" |
| `[KEY_VALUE_PROP_2]` | string | "Offline-first reliability" |
| `[KEY_VALUE_PROP_3]` | string | "Zero-config setup" |
| `[USER_NEED_1]` | phrase | "I need to organize my work" |
| `[USER_NEED_2]` | phrase | "I want to track progress" |
| `[USER_NEED_3]` | phrase | "I need to collaborate with my team" |
| `[ADVANCED_USER_NEED_1]` | phrase | "I need automated scheduling" |
| `[ADVANCED_USER_NEED_2]` | phrase | "I want custom reporting" |
| `[USER_STORY_1]` | story | "create a new task with due date" |
| `[USER_STORY_2]` | story | "assign tasks to team members" |
| `[USER_STORY_3]` | story | "filter tasks by status" |
| `[USER_STORY_4]` | story | "view project progress" |
| `[USER_STORY_5]` | story | "export task report" |

## Scope
| Placeholder | Type | Example |
|---|---|---|
| `[SCOPE_ITEM_1]` | string | "Create/Edit/Delete primary entity" |
| `[SCOPE_ITEM_2]` | string | "Search and filter entities" |
| `[SCOPE_ITEM_3]` | string | "Export data to CSV" |
| `[OUT_OF_SCOPE_ITEM_1]` | string | "Real-time collaboration" |
| `[OUT_OF_SCOPE_ITEM_2]` | string | "Mobile app" |
| `[NON_GOAL_1]` | string | "Multi-user support" |
| `[NON_GOAL_2]` | string | "Cloud sync" |
| `[NON_GOAL_3]` | string | "API access" |

## Architecture
| Placeholder | Type | Example |
|---|---|---|
| `[CORE_FUNCTION_1]` | string | "Create tasks" |
| `[CORE_FUNCTION_2]` | string | "Edit tasks" |
| `[PRIMARY_FUNCTION_1]` | string | "Task management" |
| `[PRIMARY_FUNCTION_1_DESC]` | string | "CRUD operations on tasks" |
| `[PRIMARY_FUNCTION_2]` | string | "Project organization" |
| `[PRIMARY_FUNCTION_2_DESC]` | string | "Group tasks into projects" |
| `[PRIMARY_FUNCTION_3]` | string | "Reporting" |
| `[PRIMARY_FUNCTION_3_DESC]` | string | "Generate progress reports" |
| `[PRIMARY_FUNCTION_4]` | string | "Notifications" |
| `[PRIMARY_FUNCTION_4_DESC]` | string | "Remind users of deadlines" |
| `[FLOW_1]` | string | "Create and assign a task" |
| `[FLOW_2]` | string | "Complete a task" |
| `[FLOW_3]` | string | "Review project status" |
| `[FLOW_4]` | string | "Generate weekly report" |
| `[LIST_PRIMARY_SCREENS_AND_FEATURES]` | string | "Dashboard, TaskList, ProjectView, Reports" |

## Quality
| Placeholder | Type | Example |
|---|---|---|
| `[PERF_TARGET_1]` | string | "Render lists under 100ms" |
| `[ROBUSTNESS_REQ_1]` | string | "No data loss on crash" |
| `[EXPLAIN_REQ_1]` | string | "Calculations show their steps" |
| `[PRIVACY_REQ_1]` | string | "All data stays local" |
| `[UNIT_TEST_FOCUS_1]` | string | "domain rules and calculations" |
| `[PROPERTY_TEST_FOCUS_1]` | string | "state transitions" |
| `[MVP_STEP_1]` | milestone | "User can create a task" |
| `[MVP_STEP_2]` | milestone | "User can organize tasks" |
| `[MVP_STEP_3]` | milestone | "User can filter tasks" |
| `[MVP_STEP_4]` | milestone | "User can export data" |
| `[MVP_STEP_5]` | milestone | "User can undo changes" |

## Units & Misc
| Placeholder | Type | Example |
|---|---|---|
| `[UNIT_CONVENTION_1]` | string | "millimeters" |
| `[UNIT_CONVENTION_2]` | string | "square meters" |
| `[OPEN_QUESTION_1]` | string | "Should we support bulk operations?" |
| `[OPEN_QUESTION_2]` | string | "What is the max task depth?" |
| `[OPEN_QUESTION_3]` | string | "Should we support recurring tasks?" |
| `[PROJECT_DISCLAIMER]` | paragraph | "This is an MVP specification" |
