# Project Report: Manufacturing Quality Management System (MQMS)

**Generated:** September 10, 2026  
**Repository:** `manufacturing-qms`  
**Version:** 0.1.0 (MVP in Development)

---

## 1. Executive Summary

The **Manufacturing Quality Management System (MQMS)** is a modern, web-based enterprise application designed to digitize and streamline quality investigation workflows in manufacturing environments. The system replaces fragmented, manual tools — paper forms, Excel spreadsheets, Word documents, email chains, and WhatsApp messages — with a centralized, structured, and fully traceable digital platform.

The first and current module focuses on **Audit Management** paired with **5 Why Root Cause Analysis**, enabling quality teams to investigate manufacturing defects systematically and track corrective actions through to closure.

---

## 2. Problem Being Solved

Manufacturing companies currently suffer from disconnected, error-prone quality management processes:

| Pain Point | Impact |
|---|---|
| Paper-based audit forms | Missing or inconsistent data |
| Excel / Word workflows | No centralized history |
| Email & WhatsApp communication | Poor collaboration and traceability |
| Manual tracking | Difficulty monitoring investigation progress |
| Siloed processes | Limited visibility for managers and supervisors |
| Time-consuming reporting | Operational inefficiency |

MQMS directly addresses all of these by providing a single source of truth for every quality audit from creation to closure.

---

## 3. Product Vision & Goals

**Vision:** Build a modern, intuitive, and reliable Quality Management System that simplifies manufacturing quality investigations while maintaining familiar workflows.

### MVP Goals
- ✅ Digitize the complete audit investigation lifecycle
- ✅ Standardize the 5 Why methodology across the organization
- ✅ Improve traceability of all quality investigations
- ✅ Enable collaboration between production and quality teams
- ✅ Reduce investigation turnaround time
- ✅ Provide management visibility through dashboards
- ✅ Create a scalable foundation for future quality modules

---

## 4. Target Users

### Primary Users
| Role | Core Responsibility |
|---|---|
| **Quality Engineer** | Creates audits, performs 5 Why investigations, defines corrective actions |
| **Production Supervisor** | Reviews investigations, validates root causes, closes audits |
| **Plant Manager** | Monitors KPIs, reviews audit history, tracks quality performance |
| **Production Operator** | Reports manufacturing issues |

### Secondary Users
| Role | Core Responsibility |
|---|---|
| **Quality Administrator** | Configures system settings, manages departments and production lines |
| **System Administrator** | Full system access and user management |

---

## 5. Core Features (MVP Scope)

### 5.1 Authentication
- Secure email/password login
- Role-based access control (RBAC) enforced on all routes
- Session timeout management
- Unauthenticated users redirected to login

### 5.2 Dashboard
- KPI overview cards: Open Audits, In Progress, Closed, Overdue Actions
- Role-specific views (Engineers see assigned audits; Managers see plant-wide overview)
- Recent activity feed
- Quick action buttons

### 5.3 Audit Management
- Create audit with: title, plant, department, production line, product, severity, description, evidence, assigned investigator
- Search, filter, and sort the audit list
- Full audit detail view with status, timeline, attachments, and team
- Severity levels: Low, Medium, High, Critical

### 5.4 5 Why Analysis
- Structured sequential root cause investigation
- 5 Why questions answered one-by-one (cannot skip)
- Root cause documentation (mandatory)
- Root cause categorization (optional)
- Investigation summary notes
- Save as draft at any point

### 5.5 Corrective Actions
- Assign corrective actions to system users
- Set target completion dates
- Track status (open → in progress → completed)
- At least one corrective action required before closing an audit

### 5.6 File Attachments
- Supported formats: JPG, PNG, PDF, DOCX
- Multiple attachments per audit
- Permanently linked to audit records

### 5.7 Notifications
- Notified when audit is assigned
- Notified when corrective action is assigned
- Notified when due dates are approaching
- Notified when audit is closed

---

## 6. Audit Lifecycle

```
Draft → Open → Investigation In Progress → Investigation Completed → Closed
```

| State | Description |
|---|---|
| **Draft** | Audit created but not yet submitted |
| **Open** | Audit submitted, investigation not started |
| **Investigation In Progress** | 5 Why analysis underway |
| **Investigation Completed** | Root cause and corrective actions defined |
| **Closed** | Audit reviewed and formally closed (read-only) |

**Key Rules:**
- Status cannot skip stages
- Reverse transitions are not permitted
- Closed audits are fully read-only
- Cannot close without completed 5 Why + root cause + corrective action

---

## 7. Data Model

### Core Entities

```
User
 │ Creates
 ▼
Audit
 │ Has One
 ▼
Investigation
 ├── Has Many → Attachments
 └── Has Many → Activity Log
```

### Entity Summary

| Entity | Key Fields |
|---|---|
| **User** | id, employeeId, fullName, email, role, department, plant |
| **Audit** | id, auditNumber, title, problemStatement, plant, department, severity, status, reportedBy, assignedTo |
| **Investigation** | auditId, why1–why5, rootCause, correctiveAction, actionOwner, targetCompletionDate |
| **Attachment** | auditId, fileName, fileType, fileSize, uploadedBy |
| **Activity Log** | auditId, action, description, performedBy, createdAt |

---

## 8. Role-Based Permissions

| Action | Quality Engineer | Production Supervisor | Plant Manager | Administrator |
|---|---|---|---|---|
| Create Audit | ✅ | ✅ | ❌ | ✅ |
| Edit Audit | Own/Assigned | ✅ | ❌ | ✅ |
| Delete Audit | ❌ | ❌ | ❌ | ✅ |
| Perform Investigation | ✅ | ✅ | ❌ | ✅ |
| Close Audit | ❌ | ✅ | ❌ | ✅ |
| Upload Attachments | ✅ | ✅ | ❌ | ✅ |
| View All Audits | Own | ✅ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ✅ |
| View Reports/Dashboard | ✅ | ✅ | ✅ | ✅ |

---

## 9. Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 16.3** (App Router) | Full-stack React framework with file-based routing |
| **React 19.2** | UI rendering |
| **TypeScript** | Strict typing throughout |
| **Tailwind CSS v4** | Utility-first styling |
| **shadcn/ui** | Pre-built accessible UI components |
| **React Hook Form + Zod** | Form management and schema validation |
| **Recharts** | Data visualization / charts |
| **Lucide React** | Icon library |

### Backend
| Technology | Purpose |
|---|---|
| **Supabase** | Authentication, PostgreSQL DB, file storage |
| **Row Level Security (RLS)** | Database-level permission enforcement |

### Deployment
| Technology | Purpose |
|---|---|
| **Vercel** | Hosting and CI/CD |

### Testing
| Technology | Purpose |
|---|---|
| **Vitest** | Unit and characterization tests |

---

## 10. Frontend Architecture

The project follows a **Feature-Based Architecture** where each business module owns its components, hooks, services, types, and validation.

### Directory Structure
```
app/              → Next.js routes (lightweight, delegates to features)
components/       → Shared reusable UI components
features/
  five-s/         → Core 5S / Audit Management module
  administration/ → Admin module (users, roles)
lib/              → Utilities, stores, configuration
docs/             → All project documentation
tests/            → Characterization tests
public/           → Static assets
```

### Key Architecture Patterns
- **Feature modules** are self-contained with their own data, types, and components
- **State management:** TanStack Query (server), React Context (client), useState (local)
- **Data flow:** Page → Feature Component → Service → Supabase → Database
- UI components **never** call Supabase directly — always through service layer
- All forms use **React Hook Form + Zod** for client-side and schema validation

---

## 11. Key Application Routes

| Route | Description |
|---|---|
| `/` | Login / Home redirect |
| `/5s` | 5S Dashboard |
| `/5s/audits` | Audit list |
| `/5s/actions` | Corrective actions list |
| `/5s/reports` | Reports and analytics |
| `/5s/red` | Red tag management |
| `/5s/continuous-improvement` | CI module |
| `/administration` | Admin hub |
| `/administration/users` | User management |
| `/profile` | User profile settings |

---

## 12. Business Rules Highlights

| Rule | Description |
|---|---|
| BR-001 | Every audit has a unique Audit ID |
| BR-007 | One active investigation per audit |
| BR-013 | 5 Why questions must be answered sequentially |
| BR-015 | Every investigation must identify one root cause |
| BR-017 | At least one corrective action is required |
| BR-021–023 | Each corrective action must have a description, owner, and due date |
| BR-031 | Only authenticated users may access the application |
| BR-035 | Administrators have unrestricted system access |

---

## 13. Current Development Status

The project is actively in development (v0.1.0). Key implemented areas include:

- ✅ App shell with navigation, sidebar, and header
- ✅ Authentication gate and auth provider
- ✅ 5S feature module with multiple pages (dashboard, audit list, actions, reports, red-tag, continuous improvement)
- ✅ Administration module (users, roles)
- ✅ UI component library (shadcn/ui based)
- ✅ Preferences and i18n infrastructure
- ✅ In-memory data stores (audit-store, action-store, notification-store) for development/demo
- ✅ Characterization test suite (Vitest)
- ✅ Design reference documents and design system

---

## 14. Out of Scope (MVP)

The following are intentionally deferred to future releases:

- AI-powered recommendations or predictive analytics
- Mobile native applications
- Offline mode
- Supplier quality management
- CAPA (Corrective and Preventive Action) management
- Advanced reporting and analytics
- ERP integrations (SAP, Oracle, etc.)
- Multi-plant analytics
- Multi-Factor Authentication (MFA)
- Single Sign-On (SSO)
- Custom roles and permission groups

---

## 15. Future Vision

The long-term roadmap aims to evolve MQMS into a full **Manufacturing Quality Management Platform** with:

- CAPA Management
- Non-Conformance Reports (NCR)
- Inspection Management
- Supplier Quality module
- Internal Audits
- Document Control
- Advanced Reporting & Analytics
- Role-Based Administration (custom roles, permission groups)
- ERP Integration
- AI-assisted quality insights

---

## 16. Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Performance** | Fast page loads, optimized queries |
| **Responsiveness** | Desktop-first, iPad browser compatible |
| **Security** | RBAC, encrypted passwords, session timeout, audit logging |
| **Accessibility** | WCAG AA compliance |
| **Reliability** | Centralized data with no information loss |
| **Maintainability** | Feature-based architecture, strict TypeScript |

---

## 17. Design Principles

- Simple and intuitive — enterprise users, not tech-first
- Professional and enterprise-ready appearance
- Consistent UI patterns across all screens
- Clarity over visual complexity
- Reusable, composable components (shadcn/ui + Tailwind)
- Accessible and readable typography

---

*Report generated by Sahaa AI Engineering Assistant from codebase and documentation analysis.*
