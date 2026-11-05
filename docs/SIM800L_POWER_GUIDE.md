# SIM800L GSM Module - Complete Engineering & Power Guide

The SIM800L is a Quad-Band 2G GSM/GPRS module widely used for SMS and cellular communication. Because of its high RF burst current draw, powering and interfacing it properly is the single most critical factor for reliable operation.

---

## 1. Operating Specifications

| Parameter | Recommended Value | Absolute Limits |
| :--- | :--- | :--- |
| **Supply Voltage ($V_{BAT}$)** | **4.0 V** | **3.4 V to 4.4 V** |
| **Standby Current** | ~2 mA - 10 mA | - |
| **Transmission Peak Current** | **Up to 2.0 A** (bursts during 2G RF pulses) | - |
| **Logic Level (UART)** | **2.8 V - 3.3 V** | 3.3 V max |
| **Baud Rate (Default)** | 9600 bps or auto-baud | - |
| **SIM Card Size** | Micro-SIM / Nano-SIM with adapter | **Disable PIN lock before inserting!** |

---

## 2. Power Supply Options

### Option A: LM2596 Adjustable DC-DC Buck Converter (Recommended for Bench Testing)
1. Feed 9V or 12V 2A DC adapter into the LM2596 `IN+` and `IN-`.
2. Using a digital multimeter, measure the `OUT+` and `OUT-` pins.
3. Turn the blue potentiometer screw until the multimeter reads exactly **4.0 V**.
4. Disconnect power before wiring to the SIM800L!
5. Connect `OUT+` to SIM800L `VCC`.
6. Connect `OUT-` to SIM800L `GND` **AND** to ESP32 `GND` (Shared Common Ground).
7. Solder a **1000 µF 16V electrolytic capacitor** right across the SIM800L `VCC` and `GND` pins to absorb the 2A transient spikes.

### Option B: 18650 Li-Ion 3.7V Battery
- A single fully charged 18650 cell delivers 4.2V (falling to 3.7V nominal).
- Li-Ion chemistry has low internal resistance and can deliver 2A pulses easily.
- Connect Battery (+) to SIM800L `VCC`.
- Connect Battery (-) to SIM800L `GND` **AND** ESP32 `GND`.

---

## 3. Understanding SIM800L On-Board Ring LED Blinks

The onboard Netlight LED indicates cellular network status:

| LED Blink Pattern | Meaning | Action / Diagnosis |
| :--- | :--- | :--- |
| **Fast Blink (every ~1s)** | Module is running, searching for network | Normal startup. Wait 10-30 seconds. |
| **Slow Blink (every 3s)** | **Successfully registered to GSM network!** | **Ready to send SMS and make calls!** |
| **Continuous Rapid Blink (every 300ms)**| GPRS data connection active | Connected to cellular data. |
| **LED Goes Off / Restarts in Loop** | **Power Brownout!** | Voltage dropped below 3.4V during burst. External power or capacitor is missing. |

---

## 4. SIM Card Preparation Checklist
1. **Disable SIM PIN:** Put the SIM card into a phone first, navigate to Settings > Security > SIM Card Lock, and disable PIN prompt.
2. **2G Network Availability:** Ensure your telecom carrier supports 2G (GSM 850/900/1800/1900 MHz) in your region.
3. **Active Balance:** Verify the SIM card has SMS credits or active prepaid balance.
4. **Antenna:** Always screw on the external spring antenna or IPEX patch antenna. Without an antenna, the module will strain its RF amplifier and fail to register on cell towers.

---

## 5. Serial AT Commands Reference for SMS

```text
AT                  -> Returns "OK" if module is alive and baud rate matches.
AT+CPIN?            -> Returns "+CPIN: READY" (SIM is ready, no PIN lock).
AT+CSQ              -> Signal quality test (e.g. +CSQ: 18,0; 10-31 is good).
AT+CREG?            -> Network registration (+CREG: 0,1 or 0,5 means registered).
AT+CMGF=1           -> Sets SMS mode to TEXT mode.
AT+CMGS="+12345678" -> Initiates SMS sending to phone number.
> [Message text here]
[Ctrl+Z (0x1A)]     -> Sends the SMS message payload.
```
