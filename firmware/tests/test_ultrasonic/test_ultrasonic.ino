/**
 * INDEPENDENT HARDWARE TEST: HC-SR04 Ultrasonic Distance Sensor
 * Board: NodeMCU ESP8266 ESP-12E
 *
 * Checks:
 * - Trigger pin emits pulse on NodeMCU D1 (GPIO5)
 * - Echo pin receives pulse through 5V->3.3V voltage divider on NodeMCU D2 (GPIO4)
 * - Measures distance continuously and prints cm + visual ASCII distance bar
 */

#include <Arduino.h>

#define PIN_TRIG D1 // ESP8266 GPIO5
#define PIN_ECHO D2 // ESP8266 GPIO4 (via 1k/2k voltage divider!)

void setup() {
    Serial.begin(115200);
    delay(500);

    Serial.println("\n--- [TEST] HC-SR04 Ultrasonic Sensor Test (NodeMCU ESP8266) ---");
    Serial.println("Ensure TRIG is connected to NodeMCU D1 (GPIO5)");
    Serial.println("Ensure ECHO passes through 1k/2k voltage divider into NodeMCU D2 (GPIO4)");

    pinMode(PIN_TRIG, OUTPUT);
    pinMode(PIN_ECHO, INPUT);
    digitalWrite(PIN_TRIG, LOW);
}

void loop() {
    // 10 microsecond pulse
    digitalWrite(PIN_TRIG, LOW);
    delayMicroseconds(4);
    digitalWrite(PIN_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_TRIG, LOW);

    unsigned long duration = pulseIn(PIN_ECHO, HIGH, 30000UL); // 30ms timeout

    if (duration == 0) {
        Serial.println("[TIMEOUT] No echo detected. Check 5V VCC, GND, and voltage divider on D2.");
    } else {
        float distanceCm = duration * 0.01715f;
        Serial.printf("Distance: %6.1f cm | ", distanceCm);

        int barLength = (int)(distanceCm / 3.0f);
        if (barLength > 40) barLength = 40;
        Serial.print("[");
        for (int i = 0; i < barLength; i++) Serial.print("#");
        for (int i = barLength; i < 40; i++) Serial.print(" ");
        Serial.println("]");
    }

    delay(250);
    yield();
}
