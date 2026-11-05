# NodeMCU ESP8266 ESP-12E IoT Theft Detection System - Wiring Diagram

---

## 1. Master System Schematic Diagram

```
=============================================================================================================
                                     MASTER SYSTEM SCHEMATIC
=============================================================================================================

                                  +---------------------+
                                  |   PC USB 5V CABLE   |
                                  +----------+----------+
                                             |
                                             v (Micro-USB)
       +-------------------------------------+-------------------------------------+
       |                            NodeMCU ESP-12E                                |
       |                                                                           |
       |  [VU: 5V Output] ────────┬─────────────────────────┬──────────────────────┤
       |  [G: Ground]     ────┬───┼─────────────────────┬───┼──────────────────┬───┤
       |                      │   │                     │   │                  │   │
       |  [D1: GPIO5]  ───────┼───┼──────────┐          │   │                  │   │
       |  [D2: GPIO4]  <──────┼───┼──────┐   │          │   │                  │   │
       |  [D5: GPIO14] ───────┼───┼──┐   │   │          │   │                  │   │
       |  [D0: GPIO16] ───────┼───┼──┼───┼───┼──────┐   │   │                  │   │
       |  [D4: GPIO2]  ───────┼───┼──┼───┼───┼──┐   │   │   │                  │   │
       |  [D8: GPIO15] ───────┼───┼──┼───┼───┼──┼───┼───┼───┼──┐               │   │
       |  [D7: GPIO13] <──┐   │   │  │   │   │  │   │   │   │  │               │   │
       |  [D6: GPIO12] ───┼──┐│   │  │   │   │  │   │   │   │  │               │   │
       +------------------┼──┼┼───┼──┼───┼───┼──┼───┼───┼───┼──┼───────────────┼───┤
                          │  ││   │  │   │   │  │   │   │   │  │               │   │
                          │  ││   │  │   │   │  │   │   │   │  │               │   │
                          │  ││   │  │   │   │  │   │   │   │  │ [COMMON GND]  │   │
                          │  ││   │  │   │   │  │   │   │   │  └───────────────┼───┼──────────────┐
                          │  ││   │  │   │   │  │   │   │   │                  │   │              │
                          │  ││   │  │   │   │  │   │   │   │                  v   v              v
                          │  ││   │  │   │   │  │   │   │   │        +--------------------+       │
                          │  ││   │  │   │   │  │   │   │   │        |  HC-SR04 Sensor    |       │
                          │  ││   │  │   │   │  │   │   │   │        |  VCC  <────[VU: 5V]|       │
                          │  ││   │  │   │   │  │   │   │   │        |  GND  <────[GND]   |       │
                          │  ││   │  │   │   │  │   │   │   │        |  TRIG <────[D1]    |       │
                          │  ││   │  │   │   │  │   │   │   │        |  ECHO ─────[ 1kΩ ]─┼───────┤
                          │  ││   │  │   │   │  │   │   │   │        +────────────────────┼─┐     │
                          │  ││   │  │   │   │  │   │   │   │                             │ │     │
                          │  ││   │  │   │   │  │   │   │   │     (To NodeMCU D2) <───────┘ │     │
                          │  ││   │  │   │   │  │   │   │   │                               │     │
                          │  ││   │  │   │   │  │   │   │   │                       [ 2.0 kΩ ]    │
                          │  ││   │  │   │   │  │   │   │   │                               │     │
                          │  ││   │  │   │   │  │   │   │   │                              GND    │
                          │  ││   │  │   │   │  │   │   │   │                                     │
                          │  ││   │  │   │   │  │   │   │   │        +--------------------+       │
                          │  ││   │  │   │   │  │   │   │   │        |  LEDs Indicator    |       │
                          │  ││   │  │   │   │  │   │   │   │        |                    |       │
                          │  ││   │  │   │   │  │   │   │   │        | Green: [D5]─[220Ω]─┼───────┤
                          │  ││   │  │   │   │  │   │   │   │        |  (Anode -> Cathode -> GND) │
                          │  ││   │  │   │   │  │   │   │   │        |                    |       │
                          │  ││   │  │   │   │  │   │   │   │        | Red:   [D0]─[220Ω]─┼───────┤
                          │  ││   │  │   │   │  │   │   │   │        |  (Anode -> Cathode -> GND) │
                          │  ││   │  │   │   │  │   │   │   │        +--------------------+       │
                          │  ││   │  │   │   │  │   │   │   │                                     │
                          │  ││   │  │   │   │  │   │   │   │        +--------------------+       │
                          │  ││   │  │   │   │  │   │   │   │        |  5V Relay Module   |       │
                          │  ││   │  │   │   │  │   │   │   │        |  VCC  <────[VU: 5V]|       │
                          │  ││   │  │   │   │  │   │   │   │        |  GND  <────[GND]   |       │
                          │  ││   │  │   │   │  │   │   │   │        |  IN   <────[D4]    |       │
                          │  ││   │  │   │   │  │   │   │   │        +----+---+-----------+       │
                          │  ││   │  │   │   │  │   │   │   │             │   │                   │
                          │  ││   │  │   │   │  │   │   │   │            COM  NO (Contacts)       │
                          │  ││   │  │   │   │  │   │   │   │                                     │
                          │  ││   │  │   │   │  │   │   │   │        +--------------------+       │
                          │  ││   │  │   │   │  │   │   │   │        |  Buzzer Driver     |       │
                          │  ││   │  │   │   │  │   │   │   │        |  Buzzer (+) <─[VU] |       │
                          │  ││   │  │   │   │  │   │   │   │        |  Diode 1N4148 (//) |       │
                          │  ││   │  │   │   │  │   │   │   └───────>|  [1kΩ] -> Base (B) |       │
                          │  ││   │  │   │   │  │   │   │            |  2N2222 NPN Trans  |       │
                          │  ││   │  │   │   │  │   │   │            |  Emitter -> GND    |───────┤
                          │  ││   │  │   │   │  │   │   │            +--------------------+       │
                          │  ││   │  │   │   │  │   │   │                                         │
                          │  ││   │  │   │   │  │   │   │                                         │
                          │  ││   │  │   │   │  │   │   │            +--------------------+       │
                          │  ││   │  │   │   │  │   │   │            |  External Power    |       │
                          │  ││   │  │   │   │  │   │   │            |  LM2596 (4.0V 2A)  |       │
                          │  ││   │  │   │   │  │   │   │            |  OUT+ (4.0V) ──────┼──┐    │
                          │  ││   │  │   │   │  │   │   │            |  OUT- (GND)  ──────┼──┼─┐  │
                          │  ││   │  │   │   │  │   │   │            +--------------------+  │ │  │
                          │  ││   │  │   │   │  │   │   │                                    │ │  │
                          │  ││   │  │   │   │  │   │   │            +--------------------+  │ │  │
                          │  ││   │  │   │   │  │   │   │            | 1000 µF Capacitor  |  │ │  │
                          │  ││   │  │   │   │  │   │   │            | (+) Terminal ──────┼──┘ │  │
                          │  ││   │  │   │   │  │   │   │            | (-) Terminal ──────┼────┼──┘
                          │  ││   │  │   │   │  │   │   │            +--------------------+    │
                          │  ││   │  │   │   │  │   │   │                                      │
                          │  ││   │  │   │   │  │   │   │            +--------------------+    │
                          │  ││   │  │   │   │  │   │   │            | SIM800L (5-Pin)    |    │
                          │  ││   │  │   │   │  │   │   │            | 1: VCC <─── 4.0V   |    │
                          │  ││   │  │   │   │  │   │   │            | 2: RST (NC)        |    │
                          └───┼───┼───┼───┼───┼──┼───┼───┼────────────| 3: TXD ────> [D7]  |    │
                             └┼───┼───┼───┼───┼──┼───┼───┼───────────>| 4: RXD <─── [D6]   |    │
                              │   │   │   │   │  │   │   │            | 5: GND <─── GND    |────┘
                              │   │   │   │   │  │   │   │            | NET (Spring Ant)   |
                              │   │   │   │   │  │   │   │            +--------------------+
                              │   │   │   │   │  │   │   │
                              v   v   v   v   v  v   v   v
=============================================================================================================
```

---

## 2. Point-to-Point Connection Table

| From Component & Pin | To Component & Pin | Signal Function | Voltage Level | Notes |
| :--- | :--- | :--- | :---: | :--- |
| **NodeMCU D1** | **HC-SR04 TRIG** | Ultrasonic Trigger | 3.3V | Direct connection |
| **HC-SR04 ECHO** | **Resistor R1 (1.0 kΩ)** | Echo Pulse Out | 5.0V | First resistor of divider |
| **Resistor R1 other end** | **NodeMCU D2** | Attenuated Echo In | 3.33V | Safe for ESP8266 GPIO4 |
| **Resistor R2 (2.0 kΩ)** | **Breadboard Ground (GND)** | Divider Pulldown | 0V | Tied from D2 node to GND |
| **HC-SR04 VCC** | **NodeMCU VU** | 5V Power Supply | 5.0V | Feeds from USB 5V rail |
| **HC-SR04 GND** | **NodeMCU G** | Ground | 0V | Common Ground |
| **NodeMCU D5** | **Green LED Anode (+)** | Normal/Safe Indicator | ~2.1V | In series with 220Ω resistor |
| **Green LED Cathode (-)** | **NodeMCU G** | Ground Return | 0V | Flat edge of LED |
| **NodeMCU D0** | **Red LED Anode (+)** | Theft Alert Strobe | ~1.9V | In series with 220Ω resistor |
| **Red LED Cathode (-)** | **NodeMCU G** | Ground Return | 0V | Flat edge of LED |
| **NodeMCU D4** | **Relay Module IN** | Relay Trigger Signal | 3.3V | Active-LOW trigger (GPIO2) |
| **Relay Module VCC** | **NodeMCU VU** | Relay Coil Power | 5.0V | Feeds from USB 5V rail |
| **Relay Module GND** | **NodeMCU G** | Ground | 0V | Common Ground |
| **NodeMCU D8** | **Transistor Base (B)** | Buzzer Drive | 3.3V | Via 1.0 kΩ base resistor |
| **Transistor Emitter (E)** | **NodeMCU G** | Ground Return | 0V | Direct connection |
| **Transistor Collector (C)**| **Buzzer Negative (-)** | Switched Ground | 0V | Switches buzzer to GND |
| **Buzzer Positive (+)** | **NodeMCU VU** | Buzzer Supply | 5.0V | With parallel 1N4148 diode |
| **NodeMCU D6** | **SIM800L Pin 4 (RXD)** | SoftwareSerial TX | 3.3V | ESP8266 transmits AT commands |
| **SIM800L Pin 3 (TXD)** | **NodeMCU D7** | SoftwareSerial RX | ~2.8V | SIM800L transmits replies |
| **LM2596 OUT+ (4.0V)** | **SIM800L Pin 1 (VCC)** | GSM Power Rail | 4.0V | **Dedicated external power!** |
| **SIM800L Pin 2 (RST)** | **Unconnected (NC)** | Hardware Reset | - | Managed in software |
| **LM2596 OUT- (GND)** | **SIM800L Pin 5 (GND)** | Power Ground | 0V | Tied across 1000µF capacitor |
| **LM2596 OUT- (GND)** | **NodeMCU G** | **Common Ground Link**| 0V | **Mandatory shared ground!** |
