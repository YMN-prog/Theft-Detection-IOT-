# Component Identification & Hardware Verification

This document specifies the exact hardware components used in the **NodeMCU ESP8266 ESP-12E IoT Theft Detection System**, verifies visible markings, pinouts, voltage levels, and highlights critical validation checks.

---

## 1. NodeMCU ESP8266 ESP-12E Development Board

### Visible Pin Layout & Labels:

```
                  +-------------------+
                  |     Micro-USB     |
                  +-------------------+
          [A0]    | A0             D0 |   [GPIO16]
          [GND]   | G              D1 |   [GPIO5]
          [5V VU] | VU             D2 |   [GPIO4]
          [Flash] | S3             D3 |   [GPIO0]
          [Flash] | S2             D4 |   [GPIO2]
          [Flash] | S1             3V |   [3.3V]
          [Flash] | SC              G |   [GND]
          [Flash] | S0             D5 |   [GPIO14]
          [Flash] | SK             D6 |   [GPIO12]
          [GND]   | G              D7 |   [GPIO13]
          [3.3V]  | 3V             D8 |   [GPIO15]
          [EN]    | EN             RX |   [GPIO3 / RX0]
          [RST]   | RST            TX |   [GPIO1 / TX0]
          [GND]   | G               G |   [GND]
          [VIN]   | VIN            3V |   [3.3V]
                  +-------------------+
```

### Pin Conventions:
- **D-Pin vs GPIO:** Firmware must reference both NodeMCU `D` aliases and raw ESP8266 `GPIO` numbers.
- **Power Pins:**
  - `VU`: 5.0V directly from USB bus.
  - `VIN`: External input (5V to 9V) feeding onboard 3.3V LDO regulator.
  - `3V`: Regulated 3.3V rail (maximum output current ~500mA for ESP8266 and low-current sensors).
  - `G`: Common Ground.

---

## 2. HC-SR04 Ultrasonic Distance Sensor

### Visible Pin Order (Left to Right):
1. **VCC:** 5.0V Power Input (Connect to NodeMCU `VU` / external 5V).
2. **TRIG:** 3.3V Trigger pulse input (Connect to NodeMCU `D1` / `GPIO5`).
3. **ECHO:** 5.0V Echo pulse output (**MANDATORY:** Must pass through a 1kΩ / 2kΩ voltage divider before reaching NodeMCU `D2` / `GPIO4`!).
4. **GND:** Ground (Connect to Common Ground).

---

## 3. SIM800L GSM/GPRS Module (Red Breakout PCB)

### Identified Markings:
- SIMCom SIM800L core chip.
- Helical spring antenna soldered to NET pin (or IPEX connector).
- Micro-SIM card slot on underside.
- Red breakout PCB.

### ⚠️ Verification Required for Breakout Header Labels:
Red SIM800L breakout modules come in several manufacturer variations:
- **Standard Micro Breakout (2 rows of 6 pins):**
  - Row 1: `NET`, `VCC`, `RST`, `RXD`, `TXD`, `GND`
  - Row 2: `SPK-`, `SPK+`, `MIC-`, `MIC+`, `DTR`, `RING`
- **Alternative Breakout (Single or dual row with 5V/3V3 pins):**
  - Some variants have onboard diode or 5V regulator.

> **ACTION REQUIRED:** Inspect the silk-screen text printed immediately next to each pin on your red PCB and confirm whether your communication pins are labelled `VCC, RST, RXD, TXD, GND` or include a `5V` pin.

### Power Characteristics:
- **Operating Voltage:** 3.7V – 4.2V (Nominal: 4.0V).
- **Peak Current:** Up to 2.0A during cellular transmission bursts.
- **Strict Rule:** **NEVER power from NodeMCU 3.3V or VU pin!**

---

## 4. Single-Channel Relay Module (JQC3F-05VDC-C)

### Visible Markings:
- **Relay Model:** `JQC3F-05VDC-C`
- **Contact Ratings:** `10A 250VAC`, `10A 30VDC`
- **Control Header (3-pin):**
  - `VCC`: 5.0V Relay coil power.
  - `GND`: Ground.
  - `IN`: Trigger input (Active-LOW optocoupled).

### Terminal Block Screw Terminals:
The module features 3 screw terminals for external load switching.

#### Terminal Identification Procedure (Multimeter Continuity Test):
1. Disconnect all wires from the relay module.
2. Put your digital multimeter (DMM) in **Continuity / Beep mode**.
3. Place probes between pairs of terminals:
   - The pair that **beeps (continuous circuit)** while unpowered is **COM** and **NC (Normally Closed)**.
   - The remaining terminal is **NO (Normally Open)**.
   - To distinguish COM from NC: when energized (5V to VCC, GND to GND, IN to GND), COM and NO will close and beep, while COM and NC will open.
   - Typically on standard modules:
     - Left: **NO**
     - Center: **COM** (Common)
     - Right: **NC**
     *(Always verify with the continuity test above before wiring high-voltage loads!)*

### 3.3V Logic Level Compatibility Check:
- Because the relay coil is 5V, `VCC` requires 5V.
- In active-LOW modules, an internal optocoupler LED is tied between `VCC` (5V) and `IN`.
- When the ESP8266 drives `IN` HIGH (3.3V), the voltage drop across the optocoupler diode is $5.0\text{V} - 3.3\text{V} = 1.7\text{V}$.
- Some sensitive optocoupler LEDs will remain partially conducting with 1.7V, causing the relay to fail to turn OFF.
- **Safe Solution:** Wire `IN` to NodeMCU `D4 (GPIO2)`. If the relay stays locked ON when D4 is HIGH, power the relay VCC from 5V with a 1N4148 diode or 2N2222 NPN buffer, or test if the module's optocoupler reliably releases at 3.3V.

---

## 5. Two-Pin Buzzer

### Determination of Buzzer Type (Active vs. Passive):

| Test Method | Active Buzzer | Passive Buzzer |
| :--- | :--- | :--- |
| **DC Voltage Test (3V–5V)** | Connect '+' to 3.3V/5V and '-' to GND through a 100Ω resistor. | |
| **Observation** | Produces a **steady, continuous tone (beep)** immediately upon connecting DC power. | Produces only a **single faint click/tick** when connected and disconnected. Requires an AC frequency wave. |
| **Firmware Control** | Driven by digital `HIGH` / `LOW`. | Driven by `tone(pin, freq)` PWM function. |

### Current & Drive Protection:
- An ESP8266 GPIO pin can safely sink/source only **~12mA** (absolute maximum: 20mA).
- Electromagnetic buzzers draw **30mA – 60mA** and generate **inductive voltage spikes (back-EMF)** when switched off.
- **Requirement:** Do NOT drive directly from GPIO! Drive via an **NPN transistor (e.g. 2N2222, BC547, or S8050)** with a 1kΩ base resistor and a flyback diode (1N4148).

---

## 6. Indicator LEDs & Current-Limiting Resistors

- **Green LED (Safe / Standby Mode):**
  - Forward Voltage: ~2.1V
  - Desired Current: ~5mA–8mA
  - Resistor: $R = \frac{3.3\text{V} - 2.1\text{V}}{0.006\text{A}} \approx 200\Omega \to \mathbf{220\Omega \text{ or } 330\Omega}$.
- **Red LED (Theft Alert Strobe):**
  - Forward Voltage: ~1.9V
  - Resistor: $R = \frac{3.3\text{V} - 1.9\text{V}}{0.006\text{A}} \approx 233\Omega \to \mathbf{220\Omega \text{ or } 330\Omega}$.

---

## 7. Additional Missing Hardware Checklist

Before assembly, verify the following required parts are available:
- [ ] 1x Solderless Breadboard
- [ ] Jumper wires (Male-to-Male, Male-to-Female)
- [ ] 1x 1.0 kΩ resistor (for HC-SR04 Echo voltage divider)
- [ ] 1x 2.0 kΩ or 2.2 kΩ resistor (for HC-SR04 Echo voltage divider)
- [ ] 2x 220Ω or 330Ω resistors (for Red & Green LEDs)
- [ ] 1x 1.0 kΩ resistor + 1x NPN Transistor (2N2222 / BC547) for Buzzer drive
- [ ] 1x 1000 µF 16V low-ESR electrolytic capacitor (for SIM800L power rail)
- [ ] 1x LM2596 DC-DC adjustable buck converter (or 1S 18650 Li-ion battery) tuned to 4.0V
- [ ] 1x Micro-USB data cable (must carry data wires, not charging-only)
