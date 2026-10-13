# Project Ayu-Vision — Rural Healthcare Response Prototype

**Team:** Code Breaker  
**Team Lead:** Deepak Tyagi  
**Team Members:** Aditya Triphati, Adarsh Singh  
**Department:** B.Tech Computer Science & Engineering, FGIET

A responsive, offline-first Progressive Web App (PWA) prototype designed for a rural-health hackathon presentation. It demonstrates the three core modules of Project Ayu-Vision and puts the proposed **Autonomous Escalation Matrix** prominently on the overview screen.

## Run the prototype

1. Extract the project ZIP.
2. Install Python 3 if it is not already available.
3. Open a terminal inside the `Project_Ayu_Vision_Prototype` folder.
4. Run:

   ```bash
   python -m http.server 8000
   ```

5. Open **http://localhost:8000** in Chrome or Edge.
6. For mobile layout, use browser DevTools → Device Toolbar. For GPS/microphone tests, allow browser permission. HTTPS or localhost is required for these APIs.

Do not open `index.html` directly with a `file://` URL when testing PWA, microphone, or geolocation behaviour.

## What judges can try

### 1. AI-assisted triage demo

- Open **AI Scan**.
- Upload a photo to preview the local capture flow.
- Switch to **Audio sample** and record up to five seconds where microphone access is supported.
- The interface clearly states that a validated AI model is not connected; it does not generate a fabricated diagnosis.

### 2. Emergency SOS and first-aid guidance

- Open **Emergency SOS** and select Snakebite, Burn, Maternity Emergency, or Breathing / Chest Pain.
- Review the situation-specific first-aid guidance.
- Click **Use demo location** for sample coordinates (labelled as demo data), or request live GPS permission.
- Enter a test recipient number and click **Prepare primary SMS** to show a visible message preview. On supported devices, **Open messaging app** can pass the prepared text to the SMS composer. The user must review and send it.
- Use **Call 112** only for an actual emergency; do not use emergency services to test a demo.

### 3. Autonomous Escalation Matrix

- In the Emergency SOS screen, click **Run no-response scenario**. The ten-second timer represents the proposed five-minute policy window, compressed for a presentation.
- It will finish with a clearly labelled simulated no-acknowledgement state and reveal the backup-SMS preparation button.
- Click **Simulate CHC acknowledgement** to show the alternate path where escalation stops after a simulated acknowledgement.
- These scenarios are UI simulations only. No hospital, CHC, ambulance, or private responder is contacted by the timer.

### 4. Daily Wellness & EHR

- Open **Daily Checkup** and enter measured values.
- Click **Save checkup** to store the entry in this browser's local storage.
- Click **Load sample data** to create clearly labelled demonstration readings and populate the BP chart.
- **Export CSV** downloads the saved readings; **Clear history** removes local records after confirmation.

## Prototype boundaries

- This is a hackathon UI/workflow prototype, not a medical device and not for clinical decision-making.
- No trained or clinically validated image/audio model is connected.
- No responder, hospital, ASHA account, ambulance dispatch, SMS gateway or hospital acknowledgement endpoint is integrated.
- SOS text is prepared as a draft. A browser cannot silently send SIM-based SMS; delivery is not guaranteed.
- Live geolocation needs user permission and may be unavailable or inaccurate. Demo coordinates are sample values and are explicitly labelled.
- The acknowledgement/no-response timer is a presentation simulation. In the planned deployment, the acknowledgement policy, responder directory and escalation integration require real backend services and verified contacts.
- Health records and contact preferences are stored in the current browser profile using local storage. They are not encrypted, backed up, or shared with a health worker. Use demo data only; avoid identifiable patient information.
- The service worker caches the app shell after the first successful load. Remote fonts may not be available offline.

## Future integration priorities

1. Connect an appropriately validated, clinically evaluated on-device model and cautious messaging.
2. Implement native Android capabilities for reliable SIM-based SMS, permission handling and background execution.
3. Integrate verified CHC/private-hospital contact directories and a real acknowledgement channel.
4. Add consent controls, encrypted storage, retention/deletion policies and a secure ASHA-worker sync/export pathway.
5. Review first-aid text with qualified clinicians and local emergency stakeholders.
