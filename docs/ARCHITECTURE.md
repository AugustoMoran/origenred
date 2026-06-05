# Architecture Documentation - Platforma de Facturación

## Overview
This platform is a modular MonoRepo following enterprise standards for scalability, maintainability, and security.

## Modules Structure
The backend is organized into domain-driven modules:
- **Auth**: JWT, Refresh Token Rotation, Permissions.
- **Inventory**: Products, Categories, Stock tracking.
- **Stock**: Branch-based stock levels and movement history.
- **Sales**: Transaction processing, AFIP integration (via queues).
- **AFIP**: Electronic billing SDK wrapper.
- **Branches**: Multi-branch management.

## Authentication Flow
1. **Login**: Returns an `access_token` (Short-lived) and sets a `refresh_token` (Long-lived) in an HttpOnly secure cookie.
2. **Refresh**: When the access token expires, the client calls `/refresh`, which verifies the cookie and rotates both tokens.
3. **Logout**: Invalidates tokens in the database and clears cookies.

## AFIP Billing Flow
1. **Sale Creation**: The sale is saved in MongoDB with `billingStatus: 'PENDING'`.
2. **Queueing**: A background job is added to BullMQ (Redis).
3. **Processing**: An AFIP Worker picks up the job, communicates with AFIP WSFE, and updates the sale with the CAE number.
4. **Real-time**: Socket.IO notifies the frontend once the billing is completed.

## Infrastructure
- **Docker**: Containerized services for Mongo, Redis, Backend, Frontend, and Nginx.
- **Nginx**: Acts as a Reverse Proxy handling routing and WebSockets.
- **Testing**: Jest for backend unit/integration tests. RTL and Playwright for frontend.

## Key Features
- **Stock Movements**: Every stock change is logged in `StockMovement`.
- **Auto-Calculations**: Margin/Price calculations handled in frontend with reactive logic.
- **Multi-branch**: Independent stock levels per branch.
- **Role-based Access**: Dynamic permissions per user.
