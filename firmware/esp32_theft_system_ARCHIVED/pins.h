#ifndef PINS_H
#define PINS_H

/**
 * ============================================================================
 * ESP32 PIN CONFIGURATION & SAFETY CHECKS
 * Project: ESP32 IoT Theft Detection System
 * ============================================================================
 * 
 * Hardware Compatibility Notes:
 * - GPIO 1, 3: Kept free for USB flashing and Serial Monitor (UART0).
 * - GPIO 6-11: FORBIDDEN! Connected to internal SPI flash memory.
 * - GPIO 0, 2, 12, 15: Avoided to prevent boot strapping conflicts.
 * - GPIO 34-39: Input-only, no internal pull-up/pull-down (Avoided for outputs).
 * - GPIO 5: Safe digital output (Trig).
 * - GPIO 18: Safe digital input (Echo - MUST have 5V->3.3V voltage divider!).
 * - GPIO 19: Safe digital output (Buzzer).
 * - GPIO 21: Safe digital output (Green LED - Armed / Standby).
 * - GPIO 22: Safe digital output (Red LED - Theft Alert).
 * - GPIO 23: Safe digital output (Relay Module).
 * - GPIO 16, 17: HardwareSerial UART2 (SIM800L GSM Communication).
 * - GPIO 4: Optional GSM module hardware reset.
 */

// --- Ultrasonic Sensor (HC-SR04) ---
#define PIN_ULTRASONIC_TRIG    5   // Output trigger pulse
#define PIN_ULTRASONIC_ECHO    18  // Input echo pulse (Requires 1k/2k voltage divider!)

// --- Status Indicators & Actuators ---
#define PIN_LED_GREEN          21  // Armed / Normal Standby LED (via 220-330 ohm resistor)
#define PIN_LED_RED            22  // Theft Alert / Siren LED (via 220-330 ohm resistor)
#define PIN_BUZZER             19  // Audible alert buzzer
#define PIN_RELAY              23  // Relay module (Active LOW or HIGH based on module)

// --- SIM800L GSM Module (HardwareSerial UART2) ---
#define PIN_GSM_RX             16  // ESP32 RX2 connects to SIM800L TXD
#define PIN_GSM_TX             17  // ESP32 TX2 connects to SIM800L RXD
#define PIN_GSM_RESET          4   // GSM Hardware Reset (Active LOW, optional)

// --- Active Logic Levels ---
#define RELAY_ACTIVE_LEVEL     LOW // Most 1-channel relay modules are active LOW
#define RELAY_INACTIVE_LEVEL   HIGH

#define BUZZER_ACTIVE_LEVEL    HIGH
#define BUZZER_INACTIVE_LEVEL  LOW

#define LED_ACTIVE_LEVEL       HIGH
#define LED_INACTIVE_LEVEL     LOW

#endif // PINS_H
