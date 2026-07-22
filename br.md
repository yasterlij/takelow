# Business Requirements Document (BRD)
# Reverse Auction Service

## 1. Document Information

| Item | Description |
|------|-------------|
| Project Name | Reverse Auction Service |
| Business Owner | Channel |
| Document Type | Business Requirement Document (BRD) |
| Version | 1.0 |

## 2. Business Background

Introducing a Reverse Auction Service as a value-added digital service that combines mobile payments, e-commerce, and gamification. The service enables customers to participate in auctions by paying a participation fee and submitting a confidential bid. The customer with the lowest unique bid wins the auction and purchases the item at the submitted bid price.

The service is expected to increase customer engagement, transaction volume, wallet usage, merchant participation, and non-interest revenue.

## 3. Business Objectives

The proposed solution shall:
- Increase Daily Active Users (DAU).
- Increase Mobile Money wallet transactions.
- Introducing a new digital revenue stream.
- Increase customer retention and loyalty
- Promote merchant products.
- Increase digital payment adoption.
- Create a differentiated customer experience.

## 4. Scope

### In Scope
- Customer registration
- Product catalog
- Auction management
- Bid management
- Wallet payment
- Winner selection
- Settlement
- Notification
- Reporting
- Administration

## 5. Stakeholders

| Stakeholder | Responsibility |
|-------------|---------------|
| Awash Bank | Business owner |
| Technology Partner | Reverse Auction Platform |
| Mobile Money Platform | Payment processing |
| Customer | Auction participant |

## 6. High-Level Business Process

```
Awash Bank Upload Product
        ↓
  Admin Approval
        ↓
  Auction Created
        ↓
  Auction Published
        ↓
  Customer Browses Product
        ↓
  Customer Pays Bid Fee
        ↓
  Customer Submits Bid
        ↓
  Auction Closed
        ↓
  Winner Selected
        ↓
  Winner Pays Winning Price
        ↓
     Settlement
        ↓
  Product Delivery
        ↓
  Auction Completed
```

## 7. Functional Business Requirements

### Module 1 – Customer Management

| ID | Requirement | Status |
|----|-------------|--------|
| BR-001 | The system shall allow registered Mobile Money customers to access the Reverse Auction service. | ✅ |
| BR-002 | The system shall authenticate customers using existing Mobile Money credentials. | ✅ |
| BR-003 | The system shall display customer profile information. | ✅ |
| BR-004 | The system shall maintain customer bidding history. | ✅ |
| BR-005 | The system shall display auction participation history. | ✅ |

### Module 2 – Product Management

| ID | Requirement | Status |
|----|-------------|--------|
| BR-006 | The system shall allow bank to upload auction products. | ✅ |
| BR-007 | The system should support multiple product categories (Electronics, Travel, Vehicles, Appliances, Digital Products, etc.). | ✅ |
| BR-008 | Each product shall contain: Product Name, Images, Description, Retail Price, Auction Duration, Bid Fee. | ✅ |
| BR-009 | The system should support multiple images. | ✅ |
| BR-010 | The system shall display product specifications. | ✅ |

### Module 3 – Auction Management

| ID | Requirement | Status |
|----|-------------|--------|
| BR-011 | The administrator shall create auctions. | ✅ |
| BR-012 | The administrator shall define: Auction Start Date, Auction End Date, Participation Fee, **Maximum Bid** (total), **Minimum Bid** (total), **Number of Winners**. | ✅ min_bid: extend 24h if total bids < threshold; max_bid: close early if reached; num_winners supported in selection |
| BR-013 | The system shall automatically activate auctions. | ✅ |
| BR-014 | The system shall automatically close auctions. | ✅ Closes on end_time; extends 24h if total bids < min_bid; closes early if total bids >= max_bid |
| BR-015 | The system shall prevent bidding after closing. | ✅ |

### Module 4 – Bid Management

| ID | Requirement | Status |
|----|-------------|--------|
| BR-016 | Customers shall pay the participation fee before bidding from wallet account. | ✅ |
| BR-017 | The system should deduct participation fees from Mobile Money Wallet. | ✅ |
| BR-018 | Participation fees shall be non-refundable. | ✅ |
| BR-019 | Customers **may submit multiple bids**. | ✅ |
| BR-020 | Each bid shall be stored securely. | ✅ |
| BR-021 | Customers shall not view other bids. | ✅ |
| BR-022 | Submitted bids cannot be modified. | ✅ |
| BR-023 | Submitted bids cannot be deleted. | ✅ |
| BR-024 | The system shall issue a bid confirmation via short code. | ❌ SMS not implemented |

### Module 5 – Winner Selection

| ID | Requirement | Status |
|----|-------------|--------|
| BR-025 | The system shall automatically determine winners when the bid closes and display on the application for all. | ✅ All winners shown; multi-winner list displayed on WinnerScreen |
| BR-026 | Winner selection logic: Sort bids → Find lowest bid → Check uniqueness → Ignore duplicated bids → Select first lowest unique bid. | ✅ Multi-winner: selects up to num_winners lowest unique bids |
| BR-027 | Winner selection shall occur immediately after auction closes. | ✅ |
| BR-028 | The process shall require no manual intervention. | ✅ |
| BR-029 | System shall generate **audit logs**. | ✅ Logger + payment audit trail |

### Module 6 – Winner Notification

| ID | Requirement | Status |
|----|-------------|--------|
| BR-030 | The system should notify winners via: SMS, Push Notification, Mobile App. | ✅ Push + App; ❌ SMS |
| BR-031 | Notification shall contain: Winning Product, Winning Price, Payment Deadline, Collection Information. | ✅ Product name + payment deadline in push notification |

### Module 7 – Winning Payment

| ID | Requirement | Status |
|----|-------------|--------|
| BR-032 | The winner will pay using Mobile Money Wallet. | ✅ |
| BR-033 | The system shall validate wallet balance. | ✅ |
| BR-034 | Successful payment shall generate a **receipt**. | ✅ Digital receipt with reference, product, amount, date |
| BR-035 | Failed payment shall trigger **reminders**. | ❌ Not implemented |
| BR-036 | If payment expires: Cancel winner, Select next lowest unique bidder. | ✅ Payment deadline enforcement + next unique bidder fallback via cron |

### Module 8 – Bank Management

| ID | Requirement | Status |
|----|-------------|--------|
| BR-037 | Upload the bid item. | ✅ |
| BR-038 | Approval workflow. | ⚠️ Products are created directly; no approval step |
| BR-039 | Dashboard for bank. | ✅ |
| BR-040 | Sales reports. | ⚠️ Basic CSV export; no formal reports |
| BR-041 | Settlement reports. | ❌ Not implemented |

### Module 9 – Settlement

| ID | Requirement | Status |
|----|-------------|--------|
| BR-042 | The system shall calculate: Participation Fee Revenue, Winning Price, Platform Share, Tax, Commission. | ❌ Not implemented |
| BR-043 | Settlement reports should be downloadable. | ❌ Not implemented |

### Module 10 – Notification

| ID | Requirement | Status |
|----|-------------|--------|
| BR-044 | System shall notify customers regarding: Auction Started, Auction Ending, Bid Accepted, Winner Announcement. | ✅ Auction Started (log), Auction Ending (push to bidders 5min before), Bid Accepted (in-app), Winner Announcement (push) |

### Module 11 – Reporting

| ID | Requirement | Status |
|----|-------------|--------|
| BR-045 | Reports include: Daily Auctions, Active Auctions, Total Participants, Total Bids, Revenue, Winning Price, Customer Statistics, Failed Payments, Settlement, Product Performance. | ❌ Not implemented |

## 8. Non-Functional Requirements

| Category | Requirement | Status |
|----------|-------------|--------|
| Performance | Support at least 100,000 concurrent users. | ⚠️ Needs load testing |
| Performance | Process a bid in less than 2 seconds. | ✅ Async via BullMQ |
| Performance | Display live auction updates in less than 5 seconds. | ✅ WebSocket + 30s polling |
| Performance | Complete winner calculation within 60 seconds after auction closure. | ✅ |
| Availability | System uptime: 99.9%. | ⚠️ Single-node; needs HA |
| Availability | Automatic failover and disaster recovery. | ❌ Not configured |
| Availability | Backup of auction and transaction data. | ❌ Not configured |
| Security | End-to-end encryption. | ❌ HTTP only (dev) |
| Security | Secure API integration. | ✅ JWT auth |
| Security | Multi-factor authentication (optional). | ❌ Not implemented |
| Security | Compliance with banking security standards. | ❌ Not audited |
| Security | Role-based access control. | ✅ Admin/User roles |
| Security | Full audit trail. | ⚠️ Partial (logs only) |
| Scalability | Support thousands of simultaneous auctions. | ✅ |
| Scalability | Handle millions of bids annually. | ⚠️ Needs DB scaling |
| Scalability | Easily onboard new merchants and product categories. | ✅ |

## 9. Business Rules

### Customer Rules
- Customer must have an active Awash Mobile Money account. ✅
- Customers must have sufficient wallet balance to pay the participation fee. ✅
- Customers must accept the auction Terms and Conditions before participating. ❌ No T&C acceptance flow
- Customers may participate in multiple auctions simultaneously. ✅
- Customers may submit multiple bids if permitted by the auction configuration. ✅
- Customers cannot view or modify submitted bids. ✅

### Auction Rules
- Every auction shall have a predefined start and end time. ✅
- Auctions shall close automatically when the countdown reaches zero. ✅
- No bids shall be accepted after closing time. ✅
- The auction timer shall be synchronized with the server time. ✅
- The administrator may set minimum and maximum total bid count for each auction. ✅ Min: extend 24h if under threshold; Max: close early if reached

### Winner Selection Rules
- The winning bid shall be the lowest unique bid. ✅
- Multiple winners supported via num_winners configuration. ✅
- Duplicate bid values shall be excluded from winner selection. ✅
- If no unique bid exists, the auction shall re-open the bid or extend the period. ⚠️ Currently marks as EXPIRED (no re-open mechanism)
- Winner selection shall be fully automated and auditable. ✅ Automated with audit logging

### Payment Rules
- The participation fee is non-refundable. ✅
- The winner must pay the winning bid amount within the configured time (e.g., 24 hours). ✅ 24h payment deadline enforced by cron
- If the winner fails to pay, the system shall automatically offer the item to the next eligible lowest unique bidder. ✅ Next unique bidder selected automatically on expiry
