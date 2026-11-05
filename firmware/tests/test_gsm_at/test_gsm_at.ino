/**
 * INDEPENDENT HARDWARE TEST: SIM800L GSM Communication & AT Bridge
 * Board: NodeMCU ESP8266 ESP-12E
 *
 * Uses SoftwareSerial on NodeMCU D7 (RX) and D6 (TX) at 9600 baud.
 * Keeps USB Serial active at 115200 baud for debugging!
 *
 * Runs automatic diagnostic checks:
 * 1. Sends "AT" to test UART communication
 * 2. Checks SIM card presence ("AT+CPIN?")
 * 3. Checks GSM Signal Quality ("AT+CSQ")
 * 4. Checks Cellular Tower Registration ("AT+CREG?")
 * 
 * Interactive AT Terminal: Type any AT command into the Serial Monitor (115200 baud)!
 */

#include <Arduino.h>
#include <SoftwareSerial.h>

#define GSM_RX_PIN D7 // ESP8266 GPIO13 (SoftwareSerial RX connects to SIM800L TXD)
#define GSM_TX_PIN D6 // ESP8266 GPIO12 (SoftwareSerial TX connects to SIM800L RXD)

SoftwareSerial gsmSerial(GSM_RX_PIN, GSM_TX_PIN);

void sendCommand(const char* cmd, unsigned long timeout = 2000) {
    Serial.printf("\n>> Sending: %s\n", cmd);
    gsmSerial.println(cmd);
    unsigned long start = millis();
    while (millis() - start < timeout) {
        while (gsmSerial.available()) {
            char c = gsmSerial.read();
            Serial.write(c);
        }
        delay(5);
        yield();
    }
}

void setup() {
    Serial.begin(115200);
    delay(500);

    Serial.println("\n=======================================================");
    Serial.println("  SIM800L GSM DIAGNOSTIC TOOL (NodeMCU ESP8266 ESP-12E)");
    Serial.println("=======================================================");
    Serial.println("Remember: SIM800L needs 3.7V - 4.2V external power (2A max)!");
    Serial.println("NodeMCU GND must be connected to SIM800L GND (Common Ground)!");
    Serial.println("SoftwareSerial started on D7 (RX) and D6 (TX) at 9600 baud...\n");

    gsmSerial.begin(9600);
    delay(1000);

    Serial.println("--- Step 1: Communication Test ---");
    sendCommand("AT", 1500);

    Serial.println("\n--- Step 2: SIM Card Status ---");
    sendCommand("AT+CPIN?", 2000);

    Serial.println("\n--- Step 3: Cellular Signal Quality (0-31) ---");
    sendCommand("AT+CSQ", 2000);

    Serial.println("\n--- Step 4: Network Registration Status ---");
    sendCommand("AT+CREG?", 2000);

    Serial.println("\n=======================================================");
    Serial.println("Diagnostic routine finished!");
    Serial.println("You can now type AT commands directly in Serial Monitor.");
    Serial.println("Try typing: AT, AT+CSQ, AT+CBC, etc. (Set Newline ending)");
    Serial.println("=======================================================\n");
}

void loop() {
    // Forward from Serial Monitor to SIM800L
    if (Serial.available()) {
        char c = Serial.read();
        gsmSerial.write(c);
    }

    // Forward from SIM800L to Serial Monitor
    if (gsmSerial.available()) {
        char c = gsmSerial.read();
        Serial.write(c);
    }

    yield();
}
