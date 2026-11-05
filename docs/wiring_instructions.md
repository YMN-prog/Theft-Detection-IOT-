# Complete Step-by-Step Wiring Instructions

Follow these step-by-step instructions to wire the **NodeMCU ESP8266 ESP-12E IoT Theft Detection System**.

---

## 1. Safety & Power First Rules

1. **DISCONNECT ALL POWER** (both the micro-USB cable and external power supply) before making or changing any connections!
2. **NEVER** power the SIM800L module from the NodeMCU's `3V` (3.3V) pin or `VU` (5V) pin.
3. **MANDATORY COMMON GROUND:** The external power supply Ground (GND) must be connected to the NodeMCU Ground (`G`) with a solid jumper wire.
4. **VOLTAGE DIVIDER ON ECHO:** Do not connect HC-SR04 `ECHO` directly to NodeMCU `D2` without the 1kΩ / 2kΩ resistor divider.

---

## 2. Wiring Step-by-Step

### Section A: HC-SR04 Ultrasonic Distance Sensor
1. Connect HC-SR04 **VCC** to NodeMCU **VU** (5V from USB) or external 5V.
2. Connect HC-SR04 **GND** to NodeMCU **G** (Ground).
3. Connect HC-SR04 **TRIG** directly to NodeMCU **D1 (GPIO5)**.
4. **Voltage Divider on ECHO:**
   - Connect HC-SR04 **ECHO** to one end of a **1.0 kΩ resistor ($R_1$)**.
   - Connect the other end of $R_1$ to a breadboard node.
   - Connect NodeMCU **D2 (GPIO4)** to that same node.
   - Connect a **2.0 kΩ (or 2.2 kΩ) resistor ($R_2$)** from that same node to **GND**.

```
HC-SR04 ECHO (5V) ──────[ 1.0 kΩ ]──────┬──────> NodeMCU D2 (GPIO4) [~3.33V Safe]
                                        │
                                   [ 2.0 kΩ ]
                                        │
                                       GND
```

---

### Section B: Status Indicator LEDs
1. **Green LED (Safe / Normal Standby):**
   - Connect NodeMCU **D5 (GPIO14)** to a **220Ω (or 330Ω) resistor**.
   - Connect the other end of the resistor to the **Anode (+ long leg)** of the Green LED.
   - Connect the **Cathode (- short leg, flat side)** of the Green LED to **GND**.
2. **Red LED (Theft Alert Strobe):**
   - Connect NodeMCU **D0 (GPIO16)** to a **220Ω (or 330Ω) resistor**.
   - Connect the other end of the resistor to the **Anode (+ long leg)** of the Red LED.
   - Connect the **Cathode (- short leg, flat side)** of the Red LED to **GND**.

---

### Section C: Single-Channel 5V Relay Module
1. Connect Relay Module **VCC** to NodeMCU **VU** (5V) or external 5V supply.
2. Connect Relay Module **GND** to NodeMCU **G** (Ground).
3. Connect Relay Module **IN** to NodeMCU **D4 (GPIO2)**.
   *(Note: The active-LOW optocoupler keeps D4 pulled HIGH at boot, ensuring safe boot execution).*
4. **Output Screw Terminals (COM / NO / NC):**
   - Connect external siren/light power supply (+) to **COM** (Center).
   - Connect external siren/light (+) wire to **NO** (Normally Open).
   - Connect external siren/light (-) return wire to external supply (-).
   *(Circuit closes only when theft is detected).*

---

### Section D: Two-Pin Buzzer (with NPN Transistor Buffer)
To protect the NodeMCU from drawing excess current (>12mA) or suffering inductive back-EMF spikes:
1. Connect an NPN transistor (e.g. **2N2222, BC547, or S8050**):
   - **Base (B):** Connect through a **1.0 kΩ resistor** to NodeMCU **D8 (GPIO15)**.
   - **Emitter (E):** Connect directly to **GND**.
   - **Collector (C):** Connect to the Buzzer's **Negative (-) pin**.
2. Connect the Buzzer's **Positive (+) pin** to NodeMCU **VU (5V)** or **3V3**.
3. Place a flyback diode (**1N4148 or 1N4007**) in parallel across the buzzer pins:
   - Diode Cathode (striped end) to Buzzer (+).
   - Diode Anode to Buzzer (-).

```
          NodeMCU VU (5V)
                │
                ├──────────────────────┐
                │                      │
             [Buzzer +]         [Diode Cathode |<─] (1N4148)
             [Buzzer -]         [Diode Anode     ]
                │                      │
                ├──────────────────────┘
                │
         Collector (C)
NodeMCU D8 ────[ 1.0 kΩ ]──── Base (B)  [2N2222 NPN]
                        Emitter (E)
                            │
                           GND
```

---

### Section E: SIM800L GSM Module

**Verified Breakout Pin Order (Left to Right / Header sequence):**
1. **VCC** (Power input, 3.7V - 4.2V, 2A peak)
2. **RST** (Hardware Reset)
3. **TXD** (Modem serial transmit output)
4. **RXD** (Modem serial receive input)
5. **GND** (Power and signal ground)

**Wiring steps:**
1. **Power Supply (LM2596 Buck Converter):**
   - Connect LM2596 **OUT+ (adjusted to 4.0V DC)** to SIM800L **Pin 1 (VCC)**.
   - Connect LM2596 **OUT- (GND)** to SIM800L **Pin 5 (GND)**.
   - Solder or place a **1000 µF (16V or 25V) electrolytic capacitor** directly across SIM800L **VCC (+)** and **GND (-)** as close as possible to the module pins to absorb 2A transmission burst droops.
2. **Pin 2 (RST):**
   - **Leave Disconnected (NC)**. The firmware controls modem resets via software AT commands (`AT+CFUN=1,1`).
3. **Common Ground:**
   - Run a jumper wire from LM2596 **OUT- (GND)** directly to NodeMCU **G (GND)**. Both systems MUST share ground!
4. **Serial Communication (SoftwareSerial):**
   - Connect SIM800L **Pin 3 (TXD)** to NodeMCU **D7 (GPIO13)** (ESP8266 SoftwareSerial RX).
   - Connect SIM800L **Pin 4 (RXD)** to NodeMCU **D6 (GPIO12)** (ESP8266 SoftwareSerial TX).
5. **Antenna & SIM Card:**
   - Attach helical spring antenna or external IPEX GSM antenna.
   - Insert Micro-SIM card with PIN lock disabled.
