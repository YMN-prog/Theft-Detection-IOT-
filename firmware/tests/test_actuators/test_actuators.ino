/**
 * INDEPENDENT HARDWARE TEST: Actuators (Buzzer, Relay, Red LED, Green LED)
 * Board: NodeMCU ESP8266 ESP-12E
 *
 * Cycles each component one by one to verify wiring and operation:
 * - Green LED: NodeMCU D5 (GPIO14)
 * - Red LED:   NodeMCU D0 (GPIO16)
 * - Buzzer:    NodeMCU D8 (GPIO15) via NPN Transistor Buffer
 * - Relay:     NodeMCU D4 (GPIO2) Active-LOW trigger
 */

#include <Arduino.h>

#define PIN_LED_GREEN  D5 // ESP8266 GPIO14
#define PIN_LED_RED    D0 // ESP8266 GPIO16
#define PIN_BUZZER     D8 // ESP8266 GPIO15 (Transistor Base via 1k resistor)
#define PIN_RELAY      D4 // ESP8266 GPIO2  (Active-LOW trigger)

void setup() {
    Serial.begin(115200);
    delay(500);

    Serial.println("\n--- [TEST] Actuator & Indicator Component Test (NodeMCU) ---");

    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);
    pinMode(PIN_RELAY, OUTPUT);

    // Initial safe states
    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_LED_RED, LOW);
    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(PIN_RELAY, HIGH); // Active LOW relay starts HIGH (OFF)
}

void loop() {
    // 1. Green LED
    Serial.println("Testing GREEN LED (NodeMCU D5 / GPIO14)...");
    digitalWrite(PIN_LED_GREEN, HIGH);
    delay(1000);
    digitalWrite(PIN_LED_GREEN, LOW);
    delay(500);

    // 2. Red LED
    Serial.println("Testing RED LED (NodeMCU D0 / GPIO16)...");
    digitalWrite(PIN_LED_RED, HIGH);
    delay(1000);
    digitalWrite(PIN_LED_RED, LOW);
    delay(500);

    // 3. Buzzer
    Serial.println("Testing BUZZER (NodeMCU D8 / GPIO15)... (Short Chirp)");
    digitalWrite(PIN_BUZZER, HIGH);
    delay(200);
    digitalWrite(PIN_BUZZER, LOW);
    delay(500);

    // 4. Relay
    Serial.println("Testing RELAY (NodeMCU D4 / GPIO2)... (Click ON for 1 second)");
    digitalWrite(PIN_RELAY, LOW); // Active LOW -> Relay ON
    delay(1000);
    digitalWrite(PIN_RELAY, HIGH); // Relay OFF
    delay(1000);

    Serial.println("--- Test cycle complete. Pausing 3 seconds before repeat ---\n");
    delay(3000);
    yield();
}
