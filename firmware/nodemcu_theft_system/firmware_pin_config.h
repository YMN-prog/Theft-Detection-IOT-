#ifndef FIRMWARE_PIN_CONFIG_H
#define FIRMWARE_PIN_CONFIG_H

/**
 * ============================================================================
 * NODEMCU ESP8266 ESP-12E PIN CONFIGURATION & SAFETY SPECIFICATION
 * Project: ESP8266 IoT Theft Detection System
 * ============================================================================
 *
 * Board: NodeMCU ESP-12E (ESP8266MOD)
 * Framework: Arduino ESP8266 Core
 *
 * Boot-Strapping Rules Respected:
 * - GPIO15 (D8): Pulled LOW at boot via Buzzer NPN transistor base to GND.
 * - GPIO2  (D4): Pulled HIGH at boot via Active-LOW Relay optocoupler to VCC.
 * - GPIO0  (D3): Kept unassigned to ensure onboard 10k pull-up holds it HIGH.
 * - GPIO1  (TX) & GPIO3 (RX): Dedicated exclusively to USB Serial / Programming.
 * - GPIO6-11: FORBIDDEN! Connected to internal SPI flash.
 */

// --- Ultrasonic Sensor (HC-SR04) ---
#define PIN_ULTRASONIC_TRIG     D1  // ESP8266 GPIO5  (Clean digital output)
#define PIN_ULTRASONIC_ECHO     D2  // ESP8266 GPIO4  (Clean digital input via 1k/2k voltage divider!)

// --- Status Indicators & Actuators ---
#define PIN_LED_GREEN           D5  // ESP8266 GPIO14 (Safe Standby: via 220-330 ohm resistor to GND)
#define PIN_LED_RED             D0  // ESP8266 GPIO16 (Theft Alert: via 220-330 ohm resistor to GND)
#define PIN_BUZZER              D8  // ESP8266 GPIO15 (Must be LOW at boot: drives NPN transistor base)
#define PIN_RELAY               D4  // ESP8266 GPIO2  (Must be HIGH at boot: active-LOW relay optocoupler)

// --- SIM800L GSM Module (SoftwareSerial) ---
#define PIN_GSM_RX              D7  // ESP8266 GPIO13 (SoftwareSerial RX connects to SIM800L TXD)
#define PIN_GSM_TX              D6  // ESP8266 GPIO12 (SoftwareSerial TX connects to SIM800L RXD)
#define PIN_GSM_RESET           255 // Hardware reset optional / unassigned to conserve GPIOs

#define PIN_DHT11               D3  // ESP8266 GPIO0 (optional DHT11 data pin)
#define RELAY_ACTIVE_LEVEL      LOW   // Standard 1-channel relay modules trigger active LOW
#define RELAY_INACTIVE_LEVEL    HIGH

#define BUZZER_ACTIVE_LEVEL     HIGH  // Transistor base turns ON when driven HIGH
#define BUZZER_INACTIVE_LEVEL   LOW

#define LED_ACTIVE_LEVEL        HIGH  // Standard common-cathode configuration
#define LED_INACTIVE_LEVEL      LOW

#endif // FIRMWARE_PIN_CONFIG_H
