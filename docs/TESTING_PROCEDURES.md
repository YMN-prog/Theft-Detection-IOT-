# ESP32 IoT Theft Detection System - Comprehensive Testing Procedures

To ensure absolute hardware safety and reliable operation, follow these step-by-step test procedures.
**Rule:** Test individual components in isolation before running the integrated security system.

---

## Stage 1: Pre-Power Hardware Verification (Cold Checks)

Do **NOT** plug in USB or power until completing this checklist:

| Check | Item | Verification Method | Safe State |
| :--- | :--- | :--- | :--- |
| 1 | **HC-SR04 Echo Voltage Divider** | Measure resistance with multimeter between Echo wire and ESP32 GPIO 18 (R1 = 1 kΩ), and from GPIO 18 to GND (R2 = 2 kΩ / 2.2 kΩ). | Must NOT be a direct wire! Voltage at GPIO 18 must be ~3.3V when Echo is 5V. |
| 2 | **SIM800L Power Isolation** | Confirm SIM800L VCC is connected to external 3.7V - 4.2V buck converter or Li-ion battery. | **SIM800L VCC must NEVER be connected to ESP32 3.3V or 5V pin!** |
| 3 | **Common Ground** | Verify a jumper connects external power supply GND directly to ESP32 GND. | Multimeter continuity beep between external GND and ESP32 GND. |
| 4 | **LED Current Limiting** | Ensure 220Ω - 330Ω resistors are in series with both Green (GPIO 21) and Red (GPIO 22) LEDs. | Never connect LEDs directly from GPIO to GND without resistors. |
| 5 | **SIM Card Preparation** | Verify SIM card is inserted in SIM800L with PIN lock disabled and cellular antenna connected. | Antenna attached firmly. |

---

## Stage 2: Individual Component Isolation Tests

Run each test sketch from `firmware/tests/` to verify each hardware peripheral independently.

### Test 2.1: HC-SR04 Ultrasonic Distance Sensor
1. Flash sketch: `firmware/tests/test_ultrasonic/test_ultrasonic.ino`
2. Open Serial Monitor at **115200 baud**.
3. **Expected Output:**
   ```text
   --- [TEST] HC-SR04 Ultrasonic Sensor Test ---
   Distance:   45.2 cm | [###############                         ]
   Distance:   38.1 cm | [############                            ]
   Distance:   12.4 cm | [####                                    ]
   ```
4. Move your hand closer and further from the sensor. Verify distance drops smoothly.
5. If output shows `[TIMEOUT]`, check 5V VCC, GND, and Trig/Echo wiring.

---

### Test 2.2: Actuators & Indicators (LEDs, Buzzer, Relay)
1. Flash sketch: `firmware/tests/test_actuators/test_actuators.ino`
2. Open Serial Monitor at **115200 baud**.
3. **Expected Behavior:**
   - **Step 1:** Green LED lights up for 1 second, then turns off.
   - **Step 2:** Red LED lights up for 1 second, then turns off.
   - **Step 3:** Active Buzzer emits a brief audible chirp (200ms).
   - **Step 4:** Relay module clicks ON (LED on relay lights up) for 1 second, then clicks OFF.
4. If a component fails to respond, check its respective GPIO pin and connection.

---

### Test 2.3: SIM800L GSM Communication & AT Commands
1. Flash sketch: `firmware/tests/test_gsm_at/test_gsm_at.ino`
2. Open Serial Monitor at **115200 baud**.
3. **Expected Automated Output:**
   ```text
   --- Step 1: Communication Test ---
   >> Sending: AT
   OK
   --- Step 2: SIM Card Status ---
   >> Sending: AT+CPIN?
   +CPIN: READY
   OK
   --- Step 3: Cellular Signal Quality (0-31) ---
   >> Sending: AT+CSQ
   +CSQ: 22,0
   OK
   --- Step 4: Network Registration Status ---
   >> Sending: AT+CREG?
   +CREG: 0,1
   OK
   ```
4. **Interactive AT Terminal:**
   Type `AT+CSQ` or `AT+CBC` into the monitor. If you receive responses, UART and power are working!
5. **Observing SIM800L LED:**
   - Fast blink (every 1s) = Searching for network.
   - Slow blink (every 3s) = **Successfully registered on cell tower!**

---

### Test 2.4: ESP32 Wi-Fi Connectivity
1. Edit `firmware/include/config.h` and enter your Wi-Fi SSID and Password.
2. Flash sketch: `firmware/tests/test_wifi/test_wifi.ino`
3. Open Serial Monitor at **115200 baud**.
4. **Expected Output:**
   ```text
   Scanning 2.4GHz Wi-Fi networks...
   Found 5 networks...
   Connecting to configured SSID: 'MyHomeWiFi'...
   .....
   [SUCCESS] Wi-Fi Connected!
   IP Address: 192.168.1.120
   Signal Strength (RSSI): -54 dBm
   ```

---

## Stage 3: Full End-to-End Theft Detection Workflow Test

Once all isolated tests pass:

1. In `firmware/include/config.h`:
   - Set `WIFI_SSID` and `WIFI_PASSWORD`.
   - Set `BACKEND_BASE_URL` to `http://<YOUR_COMPUTER_IP>:5000`.
   - Set `ALERT_PHONE_NUMBER` to your phone number with country code.
2. Start the Backend server:
   ```powershell
   cd backend
   npm run dev
   ```
3. Start the Frontend dashboard:
   ```powershell
   cd frontend
   npm run dev
   ```
4. Flash the master firmware `firmware/src/main.cpp`.
5. Open the web dashboard at `http://localhost:5173`.
6. **Arm the System:**
   - Click **"Arm System"** on the dashboard.
   - Observe Green LED on ESP32 turns solid ON.
7. **Trigger an Intrusion:**
   - Move an object closer than 35 cm (or your configured threshold).
   - Hold it in front of the ultrasonic sensor for ~0.6 seconds (3 confirmation pulses).
8. **Verify System Response:**
   - ESP32 Red LED begins rapid strobe flashing.
   - Buzzer sounds pulsed alarm tone.
   - Relay clicks closed (energized).
   - Emergency SMS arrives on your phone: `"SECURITY ALERT: Theft detected!..."`.
   - Web Dashboard displays red alert banner and sounds browser audio siren.
   - Security Event is logged in the dashboard table with timestamp and exact distance.
9. **Disarm / Reset:**
   - Click **"Silence / Reset Alarm"** on the dashboard.
   - Red LED turns off, buzzer silences, relay opens.
