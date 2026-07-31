---
applyTo: '**'
---
# IMPORTANT INSTRUCTION AND RULE TO BE FOLLOWED FOR SURE - MAKE SURE TO CHECK ALL THE CODEBASE AND ALSO THE BACKEND API AND FRONTEND BOTH PROPERLY ALLIGNED AND THE FRONTEND IS SIMPLE , MINIMAL AND MODERN AND SIMPLE AND MOBILE-FIRST BECUASE IT WILL BE USED MAXIMUM TIMES ON MOBILE DEVICES. THE BACKEND SHOULD BE EFFICIENT AND PROPERLY WORKING WITH NO ERRORS AND THE FRONTEND SHOULD HAVE NO BUGS AND SMOOTH ANIMATIONS AND TRANSITIONS. THE UI SHOULD BE CLEAN AND USER-FRIENDLY. THE API SHOULD BE FAST AND RESPONSIVE. THE DATABASE QUERIES SHOULD BE OPTIMIZED. THE CODE SHOULD BE WELL-STRUCTURED AND FOLLOW BEST PRACTICES. 


---

## 0. ABSOLUTE DIRECTIVE (READ FIRST)

This document is the **single source of truth**.

* Do **NOT** make assumptions
* Do **NOT** simplify
* Do **NOT** skip sections
* Do **NOT** remove accessibility
* Do **NOT** deviate from the red & white theme
* Do **NOT** introduce unnecessary UI complexity

If a decision is unclear:

> Choose the **most minimal, accessible, and user-friendly option**

---

## 1. PLATFORM IDENTITY & VISION

### 1.1 Product Vision

A **professional, modern, minimal, and accessible restaurant platform** that:

* Feels **trustworthy**
* Works for **all age groups**
* Requires **no learning**
* Is usable by **people with disabilities**
* Scales from **small cafés to large restaurant chains**

---

### 1.2 Core Values

* **Clarity over cleverness**
* **Accessibility over aesthetics**
* **Speed over animation**
* **Consistency over creativity**

---

## 2. DESIGN SYSTEM — RED & WHITE CANVAS

### 2.1 Color Philosophy

Red is used for:

* Primary actions
* Important emphasis
* Brand identity

White is used for:

* Space
* Readability
* Calmness

Gray is used for:

* Separation
* Backgrounds
* Secondary text

---

### 2.2 Full Color Tokens (MANDATORY)

```txt
--color-primary-red:        #D32F2F
--color-primary-red-dark:   #B71C1C
--color-primary-red-light:  #FDEAEA

--color-white:              #FFFFFF
--color-gray-50:            #F9FAFB
--color-gray-100:           #F3F4F6
--color-gray-200:           #E5E7EB
--color-gray-300:           #D1D5DB

--color-text-primary:       #111827
--color-text-secondary:     #6B7280
--color-text-disabled:      #9CA3AF

--color-success:            #16A34A
--color-warning:            #F59E0B
--color-error:              #DC2626
--color-info:               #2563EB
```

---

### 2.3 Color Usage Rules

* Red **ONLY** for actions & highlights
* Never use red for long text
* Never use red backgrounds behind paragraphs
* Buttons must have **minimum contrast ratio 4.5:1**
* Error messages must **NOT rely on red alone**

---

## 3. TYPOGRAPHY SYSTEM (CANVAS RULES)

### 3.1 Font Stack

```txt
Primary: Inter / Poppins
Fallback: system-ui, sans-serif
```

---

### 3.2 Typography Scale

| Element | Size | Weight | Usage          |
| ------- | ---- | ------ | -------------- |
| H1      | 48px | 700    | Hero titles    |
| H2      | 36px | 600    | Page titles    |
| H3      | 28px | 600    | Section titles |
| H4      | 22px | 600    | Card titles    |
| Body    | 16px | 400    | Main text      |
| Small   | 14px | 400    | Helper text    |
| Caption | 12px | 400    | Meta info      |

---

### 3.3 Text Rules

* Line height: **1.6**
* Max paragraph width: **65ch**
* No justified text
* No text overlays on images without contrast layer
* No ALL CAPS paragraphs

---

## 4. SPACING & GRID SYSTEM

### 4.1 Spacing Scale (STRICT)

```txt
4px – micro
8px – tight
12px – compact
16px – default
24px – section spacing
32px – major separation
48px – page separation
64px – hero spacing
```

---

### 4.2 Grid System

* Desktop: **12 columns**
* Tablet: **8 columns**
* Mobile: **4 columns**
* Gutter: **24px desktop, 16px mobile**

---

## 5. RESPONSIVE DESIGN RULES (NON-NEGOTIABLE)

### 5.1 Mobile First

* Design mobile first
* Scale upward progressively
* Never hide features on mobile

---

### 5.2 Touch Rules

* Minimum touch target: **44px**
* Buttons must not be adjacent without spacing
* Sticky bottom CTAs allowed on mobile

---

### 5.3 Browser Support

* Chrome
* Firefox
* Safari
* Edge

---

## 6. ACCESSIBILITY — ATOMIC LEVEL

### 6.1 Keyboard

* Tab order logical
* No keyboard traps
* Skip to content link

---

### 6.2 Screen Readers

* Proper semantic HTML
* `aria-label` for icons
* Alt text for all images

---

### 6.3 Visual Accessibility

* Focus rings visible
* Contrast AA+
* No color-only indicators

---

## 7. GLOBAL UI COMPONENTS (DEEP DETAIL)

---

### 7.1 Buttons

#### Anatomy

* Container
* Label
* Optional icon

#### Types

* Primary (Red)
* Secondary (Outline Red)
* Tertiary (Text)

#### States

* Default
* Hover
* Active
* Disabled
* Loading

---

### 7.2 Cards

#### Rules

* Rounded: 12px
* Soft shadow
* White background
* Clickable area includes entire card

---

### 7.3 Inputs & Forms

* Label always visible
* Placeholder only as hint
* Error text below field
* Success state allowed

---

## 8. NAVIGATION SYSTEM

### 8.1 Header

* Logo left
* Main nav center
* Auth buttons right
* Sticky on scroll

---

### 8.2 Footer

* Quick links
* Contact info
* Newsletter
* Social icons

---

## 9. USER ROLES & PERMISSIONS

### Customer

* Browse
* Order
* Reserve
* Track

### Restaurant Owner

* Full management
* Analytics
* Status control

### Admin

* Approvals
* Monitoring
* Moderation

---

## 10. CUSTOMER EXPERIENCE — PAGE BY PAGE

---

### 10.1 Home / Landing

* Hero CTA
* Benefits
* Features
* Metrics
* Footer

---

### 10.2 Explore Restaurants

* Search
* Filters
* Cards
* Pagination

---

### 10.3 Restaurant Detail

* Header info
* Tabs
* Menu grid
* Reserve CTA

---

### 10.4 Cart

* Item list
* Quantity control
* Price summary
* Checkout

---

### 10.5 Reservations

* Date picker
* Time slots
* Guest count
* Confirmation

---

### 10.6 Orders

* Status tracking
* History
* Reorder

---

## 11. RESTAURANT DASHBOARD (ENTERPRISE-GRADE)

---

### 11.1 Dashboard Home

* KPIs
* Alerts
* Quick actions

---

### 11.2 Orders Management

* Real-time updates
* Status changes
* Order details

---

### 11.3 Menu Management

* CRUD items
* Categories
* Availability toggle

---

### 11.4 Reservations

* Calendar view
* Table mapping
* Conflict handling

---

### 11.5 Tables

* Capacity
* Status
* Assignment

---

### 11.6 Analytics

* Charts
* Filters
* Export

---

## 12. EMPTY STATES & ERROR STATES

### Empty State Rules

* Illustration
* Friendly text
* Clear CTA

### Error Rules

* Human language
* Recovery action
* No technical jargon

---

## 13. PERFORMANCE & UX QUALITY

* Skeleton loaders
* Lazy loading
* Optimized images
* No blocking UI

---

## 14. CONSISTENCY ENFORCEMENT

* Same button behavior everywhere
* Same card layout everywhere
* Same wording everywhere

---

## 15. FINAL AI BUILD RULES

The AI **MUST**:

* Follow this document strictly
* Not invent UI patterns
* Not remove accessibility
* Not reduce scope

---

## 16. SUCCESS CRITERIA

This platform is successful if:

* A first-time user can order in < 60 seconds
* An elderly user can navigate without confusion
* A restaurant owner can manage without training

---

## 17. END OF DOCUMENT

> Build this platform as a **real-world, production SaaS**, not a demo.

---