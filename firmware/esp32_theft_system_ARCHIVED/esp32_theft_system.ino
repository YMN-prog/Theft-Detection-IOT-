#include <Arduino.h>
#include "pins.h"
#include "config.h"
#include "ultrasonic.h"
#include "actuators.h"
#include "gsm_sim800l.h"
#include "security_state.h"
#include "wifi_client.h"

// Hardware instances
UltrasonicSensor ultrasonic(PIN_ULTRASONIC_TRIG, PIN_ULTRASONIC_ECHO);
ActuatorController actuators;
GSMModule gsm(Serial2, PIN_GSM_RX, PIN_GSM_TX, PIN_GSM_RESET);
SecurityStateMachine security;
WiFiManager wifiManager(WIFI_SSID, WIFI_PASSWORD, BACKEND_BASE_URL);

// Timing variables for non-blocking execution
unsigned long lastSensorReadMillis = 0;
unsigned long lastTelemetryMillis = 0;
unsigned long lastGsmCheckMillis = 0;

// Remote command handler received from backend
void handleRemoteCommand(const String &cmd, float value) {
    Serial.printf("[Command] Remote backend command received: %s (value: %.1f)\n", cmd.c_str(), value);
    if (cmd == "arm") {
        security.arm();
    } else if (cmd == "disarm") {
        security.disarm();
        actuators.setAlarm(false);
    } else if (cmd == "reset") {
        security.resetAlarm();
        actuators.setAlarm(false);
    } else if (cmd == "setThreshold") {
        security.setThreshold(value);
    }
}

// Process serial input for direct USB debugging
void handleSerialCommands() {
    if (!Serial.available()) return;
    String line = Serial.readStringUntil('\n');
    line.trim();
    line.toUpperCase();

    if (line == "ARM") {
        security.arm();
    } else if (line == "DISARM") {
        security.disarm();
        actuators.setAlarm(false);
    } else if (line == "RESET") {
        security.resetAlarm();
        actuators.setAlarm(false);
    } else if (line == "TEST_ALARM") {
        Serial.println("[Test] Triggering test alarm for 3 seconds...");
        actuators.setAlarm(true);
        delay(3000);
        actuators.setAlarm(false);
    } else if (line == "TEST_SMS") {
        Serial.println("[Test] Sending manual test SMS via SIM800L...");
        gsm.sendSMS(ALERT_PHONE_NUMBER, "ESP32 Theft System: Test SMS successfully transmitted.");
    } else if (line == "TEST_PINS") {
        actuators.selfTest();
    } else if (line == "STATUS") {
        Serial.println("================ SYSTEM STATUS ================");
        Serial.printf("State: %s\n", security.getState() == STATE_DISARMED ? "DISARMED" :
                                   (security.getState() == STATE_ARMED_NORMAL ? "ARMED_NORMAL" : "ALARM_TRIGGERED"));
        Serial.printf("Last Distance: %.1f cm (Threshold: %.1f cm)\n", security.getLastDistance(), security.getThreshold());
        Serial.printf("Wi-Fi Connected: %s (IP: %s, RSSI: %d dBm)\n", wifiManager.isConnected() ? "YES" : "NO",
                      wifiManager.getLocalIP().c_str(), wifiManager.getRSSI());
        Serial.printf("GSM Status: %d | SMS Cooldown: %lu sec remaining\n", (int)gsm.getStatus(), gsm.getSecondsUntilNextSMS());
        Serial.printf("Actuators -> Buzzer: %d, Relay: %d, Red LED: %d, Green LED: %d\n",
                      actuators.isBuzzerActive(), actuators.isRelayActive(), actuators.isRedLedActive(), actuators.isGreenLedActive());
        Serial.println("===============================================");
    } else if (line.startsWith("THRESH ")) {
        float t = line.substring(7).toFloat();
        security.setThreshold(t);
    } else if (line == "HELP") {
        Serial.println("Available Serial Commands:");
        Serial.println("  ARM         - Arms the security system");
        Serial.println("  DISARM      - Disarms the security system");
        Serial.println("  RESET       - Resets/silences active alarm");
        Serial.println("  STATUS      - Prints complete system health status");
        Serial.println("  TEST_ALARM  - Runs 3-second buzzer & strobe test");
        Serial.println("  TEST_SMS    - Sends a test SMS to configured phone");
        Serial.println("  TEST_PINS   - Runs individual pin actuator test");
        Serial.println("  THRESH <cm> - Sets new detection threshold distance");
    }
}

void setup() {
    Serial.begin(DEBUG_BAUD_RATE);
    delay(1000);

    Serial.println("\n\n=======================================================");
    Serial.println("   ESP32 IoT THEFT DETECTION SYSTEM - FIRMWARE v1.0   ");
    Serial.println("=======================================================");

    // 1. Initialize ultrasonic sensor
    ultrasonic.begin();
    Serial.println("[Init] HC-SR04 Ultrasonic Sensor configured.");

    // 2. Initialize actuators (Buzzer, LEDs, Relay)
    actuators.begin();
    Serial.println("[Init] Actuators and Status Indicators configured.");

    // Run quick startup flash indicator
    actuators.setGreenLed(true);
    actuators.setRedLed(true);
    delay(300);
    actuators.setGreenLed(false);
    actuators.setRedLed(false);

    // 3. Initialize Security State Machine
    security.begin();

    // 4. Initialize SIM800L GSM Module
    gsm.begin(GSM_BAUD_RATE);

    // 5. Initialize Wi-Fi
    wifiManager.begin();
    wifiManager.setCommandCallback(handleRemoteCommand);

    Serial.println("[Init] Initialization complete. System ready. Type 'HELP' for commands.");
}

void loop() {
    unsigned long currentMillis = millis();

    // Check for user commands from USB Serial Monitor
    handleSerialCommands();

    // 1. Maintain Wi-Fi connection in non-blocking manner
    wifiManager.update();

    // 2. Ultrasonic Sensor reading loop
    if (currentMillis - lastSensorReadMillis >= SENSOR_READ_INTERVAL_MS) {
        lastSensorReadMillis = currentMillis;

        float distance = ultrasonic.readDistanceFiltered();

        // Process distance against security rules
        bool newAlarm = security.processReading(distance);

        if (newAlarm) {
            Serial.println("\n[ALERT] !!! THEFT EVENT TRIGGERED !!!");
            
            // Activate siren, buzzer and relay
            actuators.setAlarm(true);

            // Send immediate HTTP event to Backend
            char desc[128];
            snprintf(desc, sizeof(desc), "Intruder detected at %.1f cm (threshold: %.1f cm)",
                     distance, security.getThreshold());
            wifiManager.sendSecurityEvent(distance, security.getThreshold(), "THEFT_ALERT", desc);

            // Dispatch SMS Alert via SIM800L (with cooldown throttle protection)
            if (gsm.canSendSMS()) {
                char smsMsg[160];
                snprintf(smsMsg, sizeof(smsMsg),
                    "SECURITY ALERT: Theft detected! Object at %.1f cm (Limit: %.1f cm). Check property immediately!",
                    distance, security.getThreshold()
                );
                bool sent = gsm.sendSMS(ALERT_PHONE_NUMBER, smsMsg);
                if (sent) {
                    Serial.println("[ALERT] Emergency SMS alert sent to owner.");
                } else {
                    Serial.println("[ALERT] Could not send SMS (check SIM800L signal or balance).");
                }
            } else {
                Serial.printf("[ALERT] SMS skipped: Spam cooldown active (%lu s remaining)\n",
                              gsm.getSecondsUntilNextSMS());
            }
        }
    }

    // 3. Update Actuator flashing/beeping states
    actuators.update(security.isArmed(), security.isAlarmActive());

    // 4. Periodically check GSM status (every 30s)
    if (currentMillis - lastGsmCheckMillis >= 30000) {
        lastGsmCheckMillis = currentMillis;
        gsm.checkStatus();
    }

    // 5. Send periodic Telemetry to Backend
    if (currentMillis - lastTelemetryMillis >= TELEMETRY_INTERVAL_MS) {
        lastTelemetryMillis = currentMillis;

        const char* stateStr = "DISARMED";
        if (security.getState() == STATE_ARMED_NORMAL) stateStr = "ARMED_NORMAL";
        else if (security.getState() == STATE_ALARM_TRIGGERED) stateStr = "ALARM_TRIGGERED";

        const char* gsmStatusStr = "UNKNOWN";
        switch (gsm.getStatus()) {
            case GSM_READY: gsmStatusStr = "READY"; break;
            case GSM_SEARCHING_NETWORK: gsmStatusStr = "SEARCHING"; break;
            case GSM_SIM_ERROR: gsmStatusStr = "SIM_ERROR"; break;
            case GSM_NO_RESPONSE: gsmStatusStr = "NO_RESPONSE"; break;
            default: gsmStatusStr = "INITIALIZING"; break;
        }

        SystemTelemetryData telemetry;
        telemetry.distanceCm = security.getLastDistance();
        telemetry.thresholdCm = security.getThreshold();
        telemetry.securityState = stateStr;
        telemetry.buzzerState = actuators.isBuzzerActive();
        telemetry.relayState = actuators.isRelayActive();
        telemetry.redLedState = actuators.isRedLedActive();
        telemetry.greenLedState = actuators.isGreenLedActive();
        telemetry.gsmStatus = gsmStatusStr;
        telemetry.gsmRssi = gsm.getSignalQuality();
        telemetry.wifiRssi = wifiManager.getRSSI();
        telemetry.isArmed = security.isArmed();
        telemetry.isAlarm = security.isAlarmActive();

        String serverResponse = "";
        wifiManager.sendTelemetry(telemetry, serverResponse);
    }

    // Small yield to allow ESP32 FreeRTOS background tasks (WiFi, TCP/IP stack) to process
    delay(5);
}
