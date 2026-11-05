/**
 * INDEPENDENT HARDWARE TEST: NodeMCU ESP8266 Wi-Fi Connectivity & Scanner
 *
 * Scans available 2.4 GHz Wi-Fi networks, attempts connection with credentials,
 * and reports IP address and RSSI signal strength.
 */

#include <Arduino.h>
#include <ESP8266WiFi.h>

// Enter your 2.4 GHz Wi-Fi credentials for the test:
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

void setup() {
    Serial.begin(115200);
    delay(500);

    Serial.println("\n--- [TEST] NodeMCU ESP8266 Wi-Fi Connectivity Test ---");

    // 1. Scan available networks
    Serial.println("Scanning 2.4GHz Wi-Fi networks...");
    int n = WiFi.scanNetworks();
    if (n == 0) {
        Serial.println("No networks found.");
    } else {
        Serial.printf("Found %d networks:\n", n);
        for (int i = 0; i < n; ++i) {
            Serial.printf("  %2d: %-32s (%4d dBm) %s\n",
                i + 1,
                WiFi.SSID(i).c_str(),
                WiFi.RSSI(i),
                WiFi.encryptionType(i) == ENC_TYPE_NONE ? "Open" : "Encrypted");
            delay(10);
            yield();
        }
    }

    // 2. Attempt connection with configured credentials
    Serial.printf("\nConnecting to configured SSID: '%s'...\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 25) {
        delay(500);
        Serial.print(".");
        attempts++;
        yield();
    }

    Serial.println();
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("[SUCCESS] Wi-Fi Connected!");
        Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("Subnet Mask: %s\n", WiFi.subnetMask().toString().c_str());
        Serial.printf("Gateway: %s\n", WiFi.gatewayIP().toString().c_str());
        Serial.printf("Signal Strength (RSSI): %d dBm\n", WiFi.RSSI());
    } else {
        Serial.println("[FAILED] Could not connect to Wi-Fi.");
        Serial.println("Please check SSID and Password.");
        Serial.println("Ensure your Wi-Fi router is broadcasting 2.4 GHz (ESP8266 does not support 5 GHz).");
    }
}

void loop() {
    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("Wi-Fi Alive | IP: %s | RSSI: %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
    } else {
        Serial.println("Wi-Fi Disconnected!");
    }
    delay(5000);
    yield();
}
