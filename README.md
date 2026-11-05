# NodeMCU ESP8266 IoT Theft Detection System

A production-grade, end-to-end IoT Security & Theft Detection System powered by a **NodeMCU ESP8266 ESP-12E microcontroller**, **HC-SR04 ultrasonic sensor**, **SIM800L GSM module**, **buzzer**, **indicator LEDs**, **relay module**, a **Node.js/TypeScript REST & WebSocket backend**, and a **React + Vite responsive dashboard**.

---

## 📑 Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Hardware Components & Bill of Materials](#2-hardware-components--bill-of-materials)
3. [Wiring & Pin Configuration](#3-wiring--pin-configuration)
4. [Critical Hardware Protection & Power Rules](#4-critical-hardware-protection--power-rules)
5. [Project Directory Layout](#5-project-directory-layout)
6. [Firmware Configuration & Uploading](#6-firmware-configuration--uploading)
7. [Backend Setup (Node.js & TypeScript)](#7-backend-setup-nodejs--typescript)
8. [Frontend Setup (React, Vite & Tailwind)](#8-frontend-setup-react-vite--tailwind)
9. [Step-by-Step Testing & Verification](#9-step-by-step-testing--verification)
10. [REST API & WebSocket Documentation](#10-rest-api--websocket-documentation)

---

## 1. Architecture Overview

```
                      +-----------------------------+
                      |   HC-SR04 Ultrasonic Sensor |
                      +--------------+--------------+
                                     | (Echo via 1k/2k Voltage Divider)
                                     v
                      +-----------------------------+
                      |  NodeMCU ESP8266 (ESP-12E)  |
                      +---+-----------+-----------+-+
                          |           |           |
                          | (SoftSer) |           | (Wi-Fi 802.11 b/g/n)
                          v           v           v
           +------------------+   +-------+   +-----------------------+
           | SIM800L GSM 2G   |   |Buzzer |   | Local Wi-Fi Router    |
           | External 4.0V 2A |   |Relay  |   +-----------+-----------+
           | Common Ground    |   |LEDs   |               |
           +--------+---------+   +-------+               v
                    | (SMS)                   +-----------------------+
                    v                         | Node.js / Express API |
             Owner Cell Phone                 | SQLite Event Database |
                                              | WebSocket Server      |
                                              +-----------+-----------+
                                                          | (Live WS / REST)
                                                          v
                                              +-----------------------+
                                              | React / Vite Web App  |
                                              | Modern Cyber UI       |
                                              | Web Audio Alarm Siren |
                                              +-----------------------+
```

---

## 2. Hardware Components & Bill of Materials

| Component | Quantity | Purpose |
| :--- | :---: | :--- |
| **NodeMCU ESP8266 ESP-12E** | 1 | Master IoT controller running Arduino firmware |
| **HC-SR04 Ultrasonic Sensor** | 1 | Continuous distance & intrusion detection |
| **SIM800L GSM Module (5-pin breakout)** | 1 | Cellular SMS alert transmission via AT commands |
| **Buzzer (Active/Passive)** | 1 | Audible intrusion alarm sounder |
| **5V Relay Module (JQC3F-05VDC-C)** | 1 | Switches external high-power floodlights or sirens |
| **Red 5mm LED** | 1 | Rapid strobe alarm indicator |
| **Green 5mm LED** | 1 | Safe standby / armed indicator |
| **Resistors: 220Ω or 330Ω** | 2 | Current limiting for LEDs |
| **Resistors: 1.0 kΩ & 2.0 kΩ (or 2.2 kΩ)** | 1 each | **Echo pin 5V to 3.3V voltage divider** |
| **NPN Transistor (2N2222 / BC547 / S8050) + 1kΩ** | 1 | Buzzer drive buffer & NodeMCU GPIO protection |
| **Flyback Diode (1N4148 or 1N4007)** | 1 | Inductive kickback clamp for buzzer coil |
| **LM2596 DC-DC Buck Converter (or 1S Li-ion)** | 1 | Dedicated 4.0V / 2A power supply for SIM800L |
| **1000 µF 16V Electrolytic Capacitor** | 1 | High-burst current buffer across SIM800L VCC & GND |
| **Micro-USB Cable** | 1 | NodeMCU programming & Serial Monitor debugging |
| **Breadboard & Jumper Wires** | - | Prototyping interconnections |

---

## 3. Wiring & Pin Configuration

All pins are formally configured in [`firmware/include/firmware_pin_config.h`](file:///d:/Theif%20detection%20system(IOT)/firmware/include/firmware_pin_config.h):

| Peripheral Pin | NodeMCU Pin | ESP8266 GPIO | Direction | Wiring & Voltage Details |
| :--- | :---: | :---: | :---: | :--- |
| **HC-SR04 TRIG** | **D1** | **GPIO 5** | Output | Direct wire (3.3V pulse) |
| **HC-SR04 ECHO** | **D2** | **GPIO 4** | Input | **MUST pass through 1kΩ / 2kΩ Voltage Divider!** |
| **HC-SR04 VCC** | **VU** | 5V Rail | Power | Powered from USB 5V rail |
| **HC-SR04 GND** | **G** | GND | Power | Common ground |
| **Green LED Anode**| **D5** | **GPIO 14** | Output | Via 220Ω resistor (Cathode to GND) |
| **Red LED Anode** | **D0** | **GPIO 16** | Output | Via 220Ω resistor (Cathode to GND) |
| **Buzzer Driver** | **D8** | **GPIO 15** | Output | Through 1kΩ resistor to Base of NPN Transistor |
| **Relay IN** | **D4** | **GPIO 2** | Output | Active-LOW optocoupled relay trigger (HIGH at boot) |
| **SIM800L Pin 3 (TXD)**| **D7** | **GPIO 13** | Input | SoftwareSerial RX |
| **SIM800L Pin 4 (RXD)**| **D6** | **GPIO 12** | Output | SoftwareSerial TX |
| **SIM800L Pin 2 (RST)**| **NC** | - | - | Leave Unconnected (Software managed) |
| **SIM800L Pin 1 (VCC)**| **EXT 4.0V** | - | Power | **NEVER connect to NodeMCU! External ≥2A supply** |
| **SIM800L Pin 5 (GND)**| **EXT GND** | - | Power | **MUST tie to NodeMCU G (Shared Common Ground)** |

---

## 4. Critical Hardware Protection & Power Rules

### ⚠️ Rule 1: HC-SR04 5V Echo Protection
The ESP8266 is a 3.3V CMOS microcontroller. The HC-SR04 ECHO pin produces a 5V signal that will damage the ESP8266 GPIO.
**Voltage Divider:**
```
HC-SR04 ECHO (5V) ────[ 1.0 kΩ Resistor ]────┬────> NodeMCU D2 (GPIO 4) [~3.33V Safe!]
                                             │
                                    [ 2.0 kΩ Resistor ]
                                             │
                                         GND (Ground)
```

### ⚠️ Rule 2: SIM800L Power Isolation
- During GSM transmission bursts, the SIM800L draws **up to 2.0 Amperes**.
- The NodeMCU 3.3V onboard regulator supplies only **~500 mA max**.
- Connecting SIM800L to NodeMCU 3.3V causes immediate boot-looping and brownouts.
- **Solution:** Power SIM800L from an external **LM2596 buck converter adjusted to 4.0V**. Solder a **1000 µF capacitor** directly across SIM800L VCC and GND, and tie external GND to NodeMCU G!

---

## 5. Project Directory Layout

```
Theif detection system(IOT)/
├── docs/
│   ├── component_identification.md# Hardware specs, buzzer test, relay logic
│   ├── gpio_mapping.md            # NodeMCU D-pin ↔ GPIO table & strapping rules
│   ├── wiring_instructions.md     # Step-by-step wiring guide
│   ├── wiring_diagram.md          # ASCII schematic & point-to-point table
│   ├── power_requirements.md      # Current audit & SIM800L power budget
│   └── TESTING_PROCEDURES.md      # Testing checklists
├── firmware/
│   ├── nodemcu_theft_system/      # Flattened master sketch ready for Arduino CLI
│   │   ├── nodemcu_theft_system.ino
│   │   ├── firmware_pin_config.h
│   │   ├── config.h
│   │   ├── ultrasonic.h / .cpp
│   │   ├── actuators.h / .cpp
│   │   ├── gsm_sim800l.h / .cpp
│   │   ├── security_state.h / .cpp
│   │   └── wifi_client.h / .cpp
│   ├── include/
│   │   ├── firmware_pin_config.h
│   │   ├── config.h
│   │   └── pins.h
│   ├── src/                       # Modular C++ source files
│   └── tests/                     # NodeMCU hardware test sketches
│       ├── test_ultrasonic/       # HC-SR04 distance test (D1, D2)
│       ├── test_actuators/        # LEDs, Buzzer, Relay test (D5, D0, D8, D4)
│       ├── test_gsm_at/           # SIM800L SoftwareSerial AT bridge (D7, D6)
│       └── test_wifi/             # ESP8266 Wi-Fi scanner and test
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                       # Server configuration (PORT=5000)
│   └── src/
│       ├── index.ts               # Express & WebSocket server bootstrap
│       ├── db.ts                  # SQLite JSON database engine
│       ├── types.ts               # Shared TypeScript schemas
│       ├── websocket.ts           # Real-time WebSocket broadcasting
│       └── routes/                # REST endpoints (/telemetry, /events, /system)
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── App.tsx                # Cyber dashboard container
│       ├── components/            # UI components (Radar, Peripherals, Logs, Controls)
│       └── services/              # REST client and WebSocket manager
└── tools/
    ├── upload_firmware.ps1        # USB compile & flash tool for NodeMCU (esp8266:esp8266:nodemcuv2)
    ├── serial_monitor.ps1         # 115200 baud USB serial debugger
    └── start_system.ps1           # Launches backend and frontend simultaneously
```

---

## 6. Firmware Configuration & Uploading

### 1. Edit Configuration
Open [`firmware/nodemcu_theft_system/config.h`](file:///d:/Theif%20detection%20system(IOT)/firmware/nodemcu_theft_system/config.h):
```cpp
#define WIFI_SSID               "Your_2.4GHz_WiFi_SSID"
#define WIFI_PASSWORD           "Your_WiFi_Password"
#define BACKEND_BASE_URL        "http://192.168.1.50:5000" // IP of computer running backend
#define ALERT_PHONE_NUMBER      "+1234567890"               // Emergency SMS recipient
#define DEFAULT_DISTANCE_THRESHOLD_CM 30.0f
```

### 2. Flashing via USB Cable
Connect the NodeMCU to your PC via Micro-USB cable.

Run the provided PowerShell flasher:
```powershell
.\tools\upload_firmware.ps1 -Target main
```
*Note: If the upload hangs at `Connecting........_____`, press and hold the **FLASH** button on your NodeMCU board for 2 seconds.*

### 3. Open Serial Monitor Debugger
```powershell
.\tools\serial_monitor.ps1
```
Available serial commands:
- `ARM` — Arms the system
- `DISARM` — Disarms the system
- `RESET` — Silences active alarm
- `STATUS` — Displays live telemetry, Wi-Fi RSSI, and GSM status
- `TEST_ALARM` — Runs a 3-second buzzer and strobe alarm test
- `TEST_SMS` — Sends a test SMS to verify SIM800L
- `TEST_PINS` — Runs individual peripheral self-test

---

## 7. Backend Setup (Node.js & TypeScript)

1. Open PowerShell and navigate to `backend`:
   ```powershell
   cd "d:\Theif detection system(IOT)\backend"
   npm install
   ```
2. Start the backend in development mode:
   ```powershell
   npm run dev
   ```
   *The server starts at `http://localhost:5000` with WebSockets on `ws://localhost:5000`.*

---

## 8. Frontend Setup (React, Vite & Tailwind)

1. Open a second PowerShell window and navigate to `frontend`:
   ```powershell
   cd "d:\Theif detection system(IOT)\frontend"
   npm install
   ```
2. Start the Vite development dashboard:
   ```powershell
   npm run dev
   ```
3. Open your browser at **`http://localhost:5173`**.

---

## 9. Step-by-Step Testing & Verification

1. **Test Components Individually:**
   - Flash `.\tools\upload_firmware.ps1 -Target ultrasonic` and verify distance readings.
   - Flash `.\tools\upload_firmware.ps1 -Target actuators` and verify Green LED, Red LED, Buzzer, and Relay.
   - Flash `.\tools\upload_firmware.ps1 -Target gsm` and verify `AT`, `AT+CPIN?`, `AT+CSQ`, and `AT+CREG?`.
   - Flash `.\tools\upload_firmware.ps1 -Target wifi` and verify Wi-Fi IP and RSSI.
2. **Dashboard Simulator Mode:**
   - Open `http://localhost:5173`.
   - Click **"Trigger Test Intrusion (16cm)"** on the dashboard simulator toolbar.
   - Verify the proximity radar swings red, the web alarm siren sounds, and the intrusion event is logged with full timestamp!

---

## 10. REST API & WebSocket Documentation

### REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/telemetry` | Ingests live telemetry from NodeMCU. Returns pending commands. |
| `GET` | `/api/telemetry/latest` | Returns latest distance, actuator states, and GSM status. |
| `GET` | `/api/telemetry/recent` | Returns recent 30 readings for radar charting. |
| `POST` | `/api/events` | Logs security intrusion alerts from NodeMCU. |
| `GET` | `/api/events` | Returns security event log history. |
| `POST` | `/api/system/arm` | Arms the system (broadcasts to NodeMCU). |
| `POST` | `/api/system/disarm` | Disarms the system. |
| `POST` | `/api/system/reset` | Resets/silences active alarm siren. |
| `POST` | `/api/system/threshold` | Updates distance threshold in cm. |
| `POST` | `/api/system/simulate` | Injects simulated hardware readings for dashboard testing. |

### WebSocket Events (`ws://localhost:5000`)
- `INIT_STATE`: Dispatched immediately upon client connection with complete state.
- `TELEMETRY_UPDATE`: Real-time streaming distance and hardware actuator states.
- `SECURITY_ALERT`: Instant high-priority broadcast when theft is detected.
- `STATE_CHANGE`: Dispatched whenever armed state or threshold changes.
