# **App Name**: CrowdCare Guardian

## Core Features:

- Child Registration (Admin): Web interface for registering child details (name, parent name, contact) and generating unique QR-code-linked IDs.
- Volunteer App (QR Scan & Rescue): Mobile app for volunteers to scan QR codes, auto-capture GPS and timestamp, and transmit rescue alerts.
- Central Control Dashboard: Web dashboard displaying live rescue alerts, logs, child ID lookup, parent contact retrieval, and map view of rescue locations.
- Parent Notification System: Automatic SMS/Push notifications to parents with location details when a child is found.
- Offline Communication Simulation: Simulate LoRa communication via ESP32 module integration for network-independent messaging in volunteer app.
- Smart Duplicate Detection: AI tool to analyze incoming rescue alerts to identify and suppress potential duplicates, minimizing unnecessary actions.

## Style Guidelines:

- Primary color: Safety orange (#FF7733) for high visibility and urgency.
- Background color: Light gray (#F0F0F0) for a clean, neutral interface.
- Accent color: Teal (#33FFD1) for interactive elements and key information highlights.
- Body and headline font: 'Inter' (sans-serif) for clear, readable text across all interfaces.
- Use high-contrast icons for critical actions (rescue, alert, locate).
- Emphasize a clear hierarchy, big buttons, and minimal text for fast interaction in emergency scenarios.
- Use subtle animations to draw attention to important status updates.