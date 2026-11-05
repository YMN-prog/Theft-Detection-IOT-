# Power Requirements & Current Distribution Architecture

---

## 1. Subsystem Voltage & Current Audit

| Component | Operating Voltage | Idle / Standby Current | Peak / Transmit Current | Safe Power Rail Source |
| :--- | :---: | :---: | :---: | :--- |
| **NodeMCU ESP-12E** | 3.0V – 3.6V (Chip) / 5V (USB) | ~70 mA | ~250 mA (Wi-Fi Tx bursts) | Micro-USB Cable (5V) |
| **HC-SR04 Sensor** | 5.0 V | ~15 mA | ~20 mA (Sonic pulse) | NodeMCU `VU` (5V USB rail) |
| **SIM800L GSM Module** | **3.7V – 4.2V** (Optimum: **4.0V**) | ~2 mA – 10 mA | **Up to 2.0 A (2000 mA)** | **Dedicated External 4.0V Supply ONLY** |
| **5V Relay Module** | 5.0 V | ~4 mA (Opto only) | ~70 mA (Coil energized) | NodeMCU `VU` (5V USB rail) |
| **Green LED** | ~2.1 V | 0 mA (Off) | ~6 mA (On via 220Ω) | NodeMCU `D5` GPIO |
| **Red LED** | ~1.9 V | 0 mA (Off) | ~6 mA (On via 220Ω) | NodeMCU `D0` GPIO |
| **Buzzer** | 5.0 V | 0 mA (Off) | ~30 mA – 45 mA | NodeMCU `VU` via Transistor Buffer |

---

## 2. Why SIM800L CANNOT Be Powered from NodeMCU

1. **NodeMCU Onboard 3.3V LDO Capacity:**
   - Most NodeMCU boards use an AMS1117-3.3 or ME6211 linear voltage regulator.
   - The AMS1117 has a maximum thermal output limit of **500mA–800mA**.
   - The ESP8266 itself draws up to 250mA during Wi-Fi transmission.
   - Drawing a 2.0A pulse from this 3.3V rail drops the voltage immediately below 2.5V, triggering an instantaneous **brownout reboot** of the ESP8266.
2. **NodeMCU 5V (VU) Rail Limitations:**
   - The `VU` pin is fed directly from the host PC's USB port.
   - Standard USB 2.0 ports are current-limited to **500mA**.
   - Attempting to draw 2A from the USB port will trip the computer's USB port overcurrent protection or cause severe voltage droop.
3. **Voltage Mismatch:**
   - The SIM800L module is strictly rated for **3.4V to 4.4V**. Feeding it raw 5V will burn out the RF power amplifier.

---

## 3. Dedicated Power Supply Architecture

```
[ AC Wall Adapter (9V-12V, ≥2A) or 5V 2.5A USB Adapter ]
                           │
                           ▼
          [ LM2596 Adjustable Buck Converter ]
                           │
                           ├── Adjust trimmer screw to 4.00V DC (measured via Multimeter)
                           │
          ┌────────────────┴────────────────┐
          │ (+) 4.0V                        │ (-) GND
          ▼                                 ▼
   [ SIM800L VCC ]                   [ SIM800L GND ]
          │                                 │
          ├────────[ 1000 µF / 16V ]────────┤
          │         Low-ESR Cap             │
          │                                 ├───────────────────────┐
          │                                 │                       │
                                   COMMON GROUND JUMPER             │
                                            │                       │
                                            ▼                       ▼
                                     [ NodeMCU G (GND) ]   [ Relay & Sensor GND ]
```

### Purpose of the 1000 µF Electrolytic Capacitor:
The GSM transmitter draws current in sharp bursts lasting approximately 577 microseconds (2G TDMA burst). Long breadboard jumper wires introduce parasitic inductance and resistance ($V = L \cdot \frac{di}{dt}$), causing voltage dips of several hundred millivolts. Placing a **1000 µF 16V low-ESR capacitor** directly across the SIM800L `VCC` and `GND` pins buffers these high-speed transient spikes and keeps the supply voltage rock-solid at 4.0V.

---

## 4. Shared Common Ground Mandate

All electrical signals (UART TX/RX, ultrasonic trigger/echo, relay trigger, and LEDs) represent voltage potentials **referenced to 0V (Ground)**.
- If the external power supply GND is isolated from the NodeMCU GND, the UART signals will float and the SIM800L will see garbled data or register framing errors.
- **Rule:** A jumper wire must always tie the external power supply GND directly to one of the NodeMCU `G` pins.
