# NodeMCU ESP8266 ESP-12E GPIO Allocation & Boot-Strapping Analysis

---

## 1. NodeMCU Pin to ESP8266 GPIO Cross-Reference Table

| NodeMCU Silk Label | ESP8266 GPIO | Default Pull / Boot Role | Boot-Strapping Requirement | Safe for Project? | Selected Function |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **D0** | **GPIO16** | Deep-Sleep Wake, Internal Pull-down | High at boot, no interrupt | **YES** | **Red LED (Theft Alert)** |
| **D1** | **GPIO5** | I2C SCL, General I/O | None (Clean GPIO) | **YES** | **HC-SR04 TRIG** |
| **D2** | **GPIO4** | I2C SDA, General I/O | None (Clean GPIO) | **YES** | **HC-SR04 ECHO (via Divider)** |
| **D3** | **GPIO0** | NodeMCU FLASH Switch | **Must be HIGH at boot** | Caution | *Unassigned / Manual Arm switch* |
| **D4** | **GPIO2** | Onboard Blue LED, UART1 TX | **Must be HIGH at boot** | Safe for Active-Low | **Relay Module (IN)** |
| **D5** | **GPIO14**| SPI CLK, General I/O | None (Clean GPIO) | **YES** | **Green LED (Safe Standby)** |
| **D6** | **GPIO12**| SPI MISO, General I/O | None (Clean GPIO) | **YES** | **SIM800L RXD (ESP TX)** |
| **D7** | **GPIO13**| SPI MOSI, UART2 RX | None (Clean GPIO) | **YES** | **SIM800L TXD (ESP RX)** |
| **D8** | **GPIO15**| SPI CS, 10k pulldown | **Must be LOW at boot** | Safe for Pulled-Down | **Buzzer Driver (Transistor Base)**|
| **RX** | **GPIO3** | UART0 RX (USB Bridge) | Used by CH340 / CP2102 | Reserved | **USB Flashing & Serial Monitor** |
| **TX** | **GPIO1** | UART0 TX (USB Bridge) | Used by CH340 / CP2102 | Reserved | **USB Flashing & Serial Monitor** |
| **S0–SK**| **GPIO6–11**| High-Speed SPI Flash | **CRITICAL: DO NOT TOUCH** | **NO** | **FORBIDDEN (Crashes ESP8266)** |
| **A0** | **ADC0** | 10-bit Analog Input | Range: 0V–1.0V (0-3.3V on NodeMCU) | Reserved | *Optional Battery Sense* |

---

## 2. Boot-Strapping Safety Verification

The ESP8266 chip checks three boot-strapping pins during power-up or reset to determine its execution mode:

$$\text{Normal SPI Flash Boot Condition: } \mathbf{GPIO0 = HIGH}, \quad \mathbf{GPIO2 = HIGH}, \quad \mathbf{GPIO15 = LOW}$$

1. **GPIO15 (NodeMCU D8) $\to$ Must be LOW at boot:**
   - **Assigned to:** Buzzer NPN Transistor Base.
   - **Safety Analysis:** The base of the NPN transistor connects to Ground through its 1kΩ resistor and base-emitter junction. This holds GPIO15 at $0\text{V}$ (LOW) during startup, satisfying the boot-strap condition.
2. **GPIO2 (NodeMCU D4) $\to$ Must be HIGH at boot:**
   - **Assigned to:** Single-Channel Relay (Active-LOW `IN`).
   - **Safety Analysis:** An active-LOW optocoupled relay module pulls the `IN` pin up to its internal supply rail through the optocoupler's resistor and LED. This naturally holds GPIO2 HIGH at boot, allowing the ESP8266 to boot normally and keeping the relay OFF.
3. **GPIO0 (NodeMCU D3) $\to$ Must be HIGH at boot:**
   - Kept unassigned from active external loads so the onboard 10k pull-up resistor holds it HIGH during power-on.
4. **GPIO6–GPIO11 (S0, S1, S2, S3, SC, SK) $\to$ FORBIDDEN:**
   - These pins connect internally to the SPI flash memory chip under the RF shield. Connecting any sensor or actuator to these pins will immediately crash or brick the module.

---

## 3. UART Strategy for SIM800L GSM Communication

- **Hardware Limitation:** The ESP8266 has only one full hardware UART (UART0 on `GPIO1 TX` / `GPIO3 RX`) and one transmit-only UART (UART1 on `GPIO2 TX`).
- **USB Conflict:** UART0 is hard-wired on the NodeMCU board to the USB-to-UART bridge (CH340G or CP2102) for firmware uploading and serial monitor debugging at 115200 baud.
- **Solution:** We implement **SoftwareSerial** (`SoftwareSerial.h`) at **9600 baud**:
  - **ESP8266 SoftwareSerial RX:** NodeMCU **D7 (GPIO13)** $\longleftarrow$ SIM800L **TXD** (Has pin-change interrupt capability for receiving incoming GSM bytes).
  - **ESP8266 SoftwareSerial TX:** NodeMCU **D6 (GPIO12)** $\longrightarrow$ SIM800L **RXD** (Standard digital output for AT command transmission).
- **Benefit:** USB flashing and Serial Monitor debugging over the micro-USB cable remain 100% functional without disconnecting the GSM module!

---

## 4. 5V-to-3.3V Protection Strategy

The ESP8266 is a 3.3V CMOS device. Inputs must not exceed 3.6V:
- **HC-SR04 ECHO (5.0V output):** Passes through an external voltage divider ($R_1 = 1\text{ k}\Omega$, $R_2 = 2\text{ k}\Omega$) yielding $3.33\text{V}$ into NodeMCU **D2 (GPIO4)**.
- **HC-SR04 TRIG (3.3V input):** Accepts the 3.3V output pulse from NodeMCU **D1 (GPIO5)** directly.
- **SIM800L TXD:** Outputs ~2.8V–3.0V logic, read as clean digital HIGH by NodeMCU **D7 (GPIO13)**.
- **SIM800L RXD:** Accepts 3.3V logic from NodeMCU **D6 (GPIO12)** safely.
