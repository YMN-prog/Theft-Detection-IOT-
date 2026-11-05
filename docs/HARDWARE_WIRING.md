# ESP32 IoT Theft Detection System - Hardware Wiring & Pin Mapping

> **CRITICAL HARDWARE SAFETY NOTICE:**
> 1. **HC-SR04 Echo Pin:** Outputs **5.0V**. ESP32 GPIO pins are rated for **3.3V max**. You **MUST** use a resistor voltage divider (1 kΩ + 2 kΩ) on the Echo line to protect the ESP32 from permanent damage.
> 2. **SIM800L Power:** The SIM800L GSM module draws up to **2.0A peak bursts** during RF transmission and requires **3.7V to 4.2V** (optimum: **4.0V**). **DO NOT** attempt to power the SIM800L from the ESP32 3.3V or 5V/VIN pins! It requires an external power source with a **Shared Common Ground**.

---

## 1. GPIO Pin Assignment Table

| Peripheral | Component Pin | ESP32 GPIO | Direction | Level / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **HC-SR04** | TRIG | **GPIO 5** | Output | 3.3V logic trigger pulse (10 µs) |
| **HC-SR04** | ECHO | **GPIO 18** | Input | **Must pass through 5V -> 3.3V Voltage Divider!** |
| **HC-SR04** | VCC | External 5V / VIN | Power | Requires 5V for standard HC-SR04 |
| **HC-SR04** | GND | ESP32 GND | Power | Shared Common Ground |
| **Green LED** | Anode (+) | **GPIO 21** | Output | System Armed / Normal Standby (via 220Ω / 330Ω) |
| **Green LED** | Cathode (-) | ESP32 GND | Power | Connected to GND |
| **Red LED** | Anode (+) | **GPIO 22** | Output | Theft Alert / Siren Active (via 220Ω / 330Ω) |
| **Red LED** | Cathode (-) | ESP32 GND | Power | Connected to GND |
| **Buzzer** | Signal / I/O | **GPIO 19** | Output | Active buzzer driven HIGH on alert |
| **Buzzer** | GND / VCC | GND / 3.3V-5V | Power | Connect to module power pins |
| **Relay** | IN | **GPIO 23** | Output | Controls external siren / spotlight (Active LOW or HIGH) |
| **Relay** | VCC | 5V / VIN | Power | External 5V or ESP32 VIN (if USB powered) |
| **Relay** | GND | ESP32 GND | Power | Shared Common Ground |
| **SIM800L** | TXD | **GPIO 16 (RX2)** | Input | ESP32 HardwareSerial UART2 RX |
| **SIM800L** | RXD | **GPIO 17 (TX2)** | Output | ESP32 HardwareSerial UART2 TX |
| **SIM800L** | RST | **GPIO 4** | Output | GSM Hardware Reset (Active LOW pulse) |
| **SIM800L** | VCC | External 4.0V | Power | **DO NOT USE ESP32!** External 3.7V-4.2V (≥2A) |
| **SIM800L** | GND | External GND + ESP32 GND | Power | **MUST connect external GND to ESP32 GND!** |

---

## 2. ESP32 Pin Compatibility & Safety Analysis

| Pin Category | Pins | Status | Usage in this Project |
| :--- | :--- | :--- | :--- |
| **UART0 (USB Flashing)** | GPIO 1, GPIO 3 | **Reserved** | Kept free for USB flashing and Serial Monitor (115200 baud). |
| **Internal SPI Flash** | GPIO 6, 7, 8, 9, 10, 11 | **FORBIDDEN** | Never touch. Connected to onboard flash memory. |
| **Strapping Pins** | GPIO 0, 2, 12, 15 | **Avoided** | These pins set bootloader and flash voltage. Avoided to prevent bootloops. |
| **Input-Only Pins** | GPIO 34, 35, 36 (VP), 39 (VN) | **Avoided** | Cannot drive outputs (no internal pull-up / pull-down). |
| **Safe Output/Input Pins** | GPIO 4, 5, 16, 17, 18, 19, 21, 22, 23 | **SELECTED** | Clean, safe, dual-direction general-purpose GPIOs. |

---

## 3. Voltage Divider for HC-SR04 Echo (5V to 3.3V)

The HC-SR04 sensor runs on 5V and outputs a 5V logic pulse on its `ECHO` pin.
Connecting 5V directly into an ESP32 GPIO will degrade and eventually burn out the pin.

### Resistor Configuration:
- **R1:** 1.0 kΩ (1000 ohms)
- **R2:** 2.0 kΩ (or 2.2 kΩ)

### Circuit Diagram:
```
HC-SR04 ECHO Pin (5V)
       │
      [R1: 1.0 kΩ]
       │
       ├───────────────────> Connect to ESP32 GPIO 18 (Input)
       │                     (Voltage is now ~3.33V - completely safe!)
      [R2: 2.0 kΩ]
       │
      GND (ESP32 Ground)
```

$$\text{V}_{\text{ESP32}} = \text{V}_{\text{ECHO}} \times \frac{R_2}{R_1 + R_2} = 5.0\text{V} \times \frac{2000}{1000 + 2000} = 3.33\text{V}$$

---

## 4. SIM800L Power Architecture

```
[ External DC Supply 5V-12V 2A+ ] 
             │
             ▼
[ LM2596 Buck Converter (Adjusted to 4.0V) ]
     │ (4.0V output)                     │ (GND)
     ├──────────────────────┐            ├────────────────────────┐
     │                      │            │                        │
     ▼                      ▼            ▼                        ▼
[ 1000 µF / 16V Cap ]   [ SIM800L VCC ]  [ 1000 µF Cap GND ]  [ SIM800L GND ]
                                                                  │
                                                        COMMON GROUND WIRE
                                                                  │
                                                                  ▼
                                                           [ ESP32 GND ]
```

### Why ESP32 Power Fails for SIM800L:
- When the SIM800L registers onto a cellular tower or sends an SMS, it transmits radio frequency pulses requiring **up to 2.0 Amperes** in microsecond bursts.
- The onboard ESP32 linear regulator (AMS1117-3.3) can supply a maximum of 500mA - 800mA.
- Standard PC USB ports supply a maximum of 500mA (USB 2.0) or 900mA (USB 3.0).
- If powered from ESP32, the SIM800L will continuously restart, enter a boot loop, or cause the ESP32 to brown out (`Brownout detector was triggered`).

---

## 5. Wiring Verification Checklist Before Powering On
- [ ] HC-SR04 VCC is connected to 5V power.
- [ ] HC-SR04 Echo pin passes through the 1kΩ / 2kΩ voltage divider before reaching GPIO 18.
- [ ] Green LED has a 220Ω / 330Ω current-limiting resistor connected to GPIO 21.
- [ ] Red LED has a 220Ω / 330Ω current-limiting resistor connected to GPIO 22.
- [ ] Active Buzzer positive pin connected to GPIO 19, negative to GND.
- [ ] Relay module VCC connected to 5V, GND to GND, IN connected to GPIO 23.
- [ ] SIM800L VCC is connected to an external 3.7V - 4.2V power supply (NOT the ESP32!).
- [ ] SIM800L GND is tied together with ESP32 GND (Common Ground established).
- [ ] SIM800L TXD is connected to ESP32 GPIO 16 (RX2).
- [ ] SIM800L RXD is connected to ESP32 GPIO 17 (TX2).
- [ ] ESP32 is plugged into PC USB for programming and serial monitoring.
