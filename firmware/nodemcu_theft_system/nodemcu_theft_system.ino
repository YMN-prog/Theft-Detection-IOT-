#include <Arduino.h>

#if defined(ESP8266)
    #include <SoftwareSerial.h>
#endif

#include "firmware_pin_config.h"
#include "config.h"
#include "ultrasonic.h"
#include "actuators.h"
#include "gsm_sim800l.h"
#include "security_state.h"
#include "wifi_client.h"
#include "dht11.h"

// Hardware instances
UltrasonicSensor ultrasonic(PIN_ULTRASONIC_TRIG, PIN_ULTRASONIC_ECHO);
ActuatorController actuators;
DHT11Sensor dht(PIN_DHT11);

#if defined(ESP8266)
    // SoftwareSerial for SIM800L keeps USB hardware UART0 free for flashing and debugging
    SoftwareSerial gsmSerial(PIN_GSM_RX, PIN_GSM_TX); // D7 (RX), D6 (TX)
    GSMModule gsm(gsmSerial, PIN_GSM_RESET);
#else
    GSMModule gsm(Serial2, PIN_GSM_RESET);
#endif

SecurityStateMachine security;
WiFiManager wifiManager(WIFI_SSID, WIFI_PASSWORD, BACKEND_BASE_URL);

// Timing variables for non-blocking execution
unsigned long lastSensorReadMillis = 0;
unsigned long lastTelemetryMillis = 0;
unsigned long lastGsmCheckMillis = 0;

// Zero-delay alert dispatch queue (decouples network I/O from hardware actuation)
bool pendingAlertDispatch = false;
float pendingAlertDistance = 0.0f;
unsigned long alertTriggerMillis = 0;
bool gsmPresent = false;

// Remote command handler received from backend dashboard
void handleRemoteCommand(const String &cmd, float value) {
    Serial.printf("[Command] Backend remote command: %s (value: %.1f)\n", cmd.c_str(), value);
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
    } else if (cmd == "greenOn") {
        actuators.setGreenLedOverride(1);
        Serial.println("[Command] Green LED manually forced ON via Dashboard.");
    } else if (cmd == "greenOff") {
        actuators.setGreenLedOverride(0);
        Serial.println("[Command] Green LED manually forced OFF via Dashboard.");
    } else if (cmd == "greenAuto") {
        actuators.setGreenLedOverride(-1);
        Serial.println("[Command] Green LED restored to AUTO mode.");
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
    } else if (line == "GREEN_ON") {
        actuators.setGreenLedOverride(1);
        Serial.println("[Manual] Green LED forced ON");
    } else if (line == "GREEN_OFF") {
        actuators.setGreenLedOverride(0);
        Serial.println("[Manual] Green LED forced OFF");
    } else if (line == "GREEN_AUTO") {
        actuators.setGreenLedOverride(-1);
        Serial.println("[Manual] Green LED set to AUTO");
    } else if (line == "TEST_ALARM") {
        Serial.println("[Test] Triggering police siren alarm for 3 seconds...");
        actuators.setAlarm(true);
        unsigned long t0 = millis();
        while (millis() - t0 < 3000) {
            actuators.update(true, true);
            delay(15);
        }
        actuators.setAlarm(false);
    } else if (line == "TEST_SMS") {
        Serial.println("[Test] Sending manual test SMS via SIM800L...");
        gsm.sendSMS(ALERT_PHONE_NUMBER, "ESP8266 Theft System: Test SMS successfully transmitted.");
    } else if (line == "TEST_PINS") {
        actuators.selfTest();
    } else if (line == "STATUS") {
        Serial.println("================ SYSTEM STATUS ================");
        Serial.printf("State: %s\n", security.getState() == STATE_DISARMED ? "DISARMED" :
                                   (security.getState() == STATE_ARMED_NORMAL ? "SAFE (ARMED)" : "INTRUDER DETECTED!"));
        Serial.printf("Last Distance: %.1f cm (Threshold: %.1f cm)\n", security.getLastDistance(), security.getThreshold());
        if (dht.hasValidReading()) {
            Serial.printf("DHT11: Temp: %.1f C, Humidity: %.1f %%\n", dht.getTemperature(), dht.getHumidity());
        } else {
            Serial.println("DHT11: Standby / Not Connected (Optional sensor)");
        }
        Serial.printf("Wi-Fi Connected: %s (IP: %s, RSSI: %d dBm)\n", wifiManager.isConnected() ? "YES" : "NO",
                      wifiManager.getLocalIP().c_str(), wifiManager.getRSSI());
        Serial.printf("GSM Status: %d | SMS Cooldown: %lu sec remaining\n", (int)gsm.getStatus(), gsm.getSecondsUntilNextSMS());
        Serial.printf("Actuators -> Buzzer: %d, Relay: %d, Red LED: %d, Green LED: %d (Override: %d)\n",
                      actuators.isBuzzerActive(), actuators.isRelayActive(), actuators.isRedLedActive(),
                      actuators.isGreenLedActive(), actuators.getGreenLedOverride());
        Serial.println("===============================================");
    } else if (line.startsWith("THRESH ")) {
        float t = line.substring(7).toFloat();
        security.setThreshold(t);
    } else if (line == "HELP") {
        Serial.println("Available Serial Commands:");
        Serial.println("  ARM         - Arms the security system");
        Serial.println("  DISARM      - Disarms the security system");
        Serial.println("  RESET       - Resets/silences active alarm");
        Serial.println("  GREEN_ON    - Forces Green LED ON");
        Serial.println("  GREEN_OFF   - Forces Green LED OFF");
        Serial.println("  GREEN_AUTO  - Restores Green LED to AUTO mode");
        Serial.println("  STATUS      - Prints complete system health status");
        Serial.println("  TEST_ALARM  - Runs 3-second police siren & strobe test");
        Serial.println("  TEST_SMS    - Sends a test SMS to configured phone");
        Serial.println("  TEST_PINS   - Runs individual pin actuator test");
        Serial.println("  THRESH <cm> - Sets new detection threshold distance");
    }
}

void setup() {
    Serial.begin(DEBUG_BAUD_RATE);
    delay(500);

    Serial.println("\n\n=======================================================");
    Serial.println("   NODEMCU ESP8266 IoT INTRUSION DETECTION SYSTEM     ");
    Serial.println("=======================================================");

    // 1. Initialize ultrasonic sensor
    ultrasonic.begin();
    Serial.println("[Init] HC-SR04 configured (TRIG: D1/GPIO5, ECHO: D2/GPIO4).");

    // 2. Initialize optional DHT11 sensor (D3/GPIO0)
    dht.begin();
    Serial.println("[Init] DHT11 configured on D3 (GPIO0) - safe optional mode.");

    // 3. Initialize actuators (Buzzer D8, Relay D4, Red LED D0, Green LED D5)
    actuators.begin();
    Serial.println("[Init] Actuators and Indicators configured.");

    // Initial hardware flash & test chirp to verify buzzer and LEDs on boot
    actuators.setGreenLed(true);
    actuators.setRedLed(true);
    tone(PIN_BUZZER, 1200);
    delay(150);
    noTone(PIN_BUZZER);
    digitalWrite(PIN_BUZZER, LOW);
    actuators.setGreenLed(false);
    actuators.setRedLed(false);

    // 4. Initialize Security State Machine
    security.begin();

    // 5. Initialize SIM800L GSM Module on SoftwareSerial (D7 RX, D6 TX)
#if defined(ESP8266)
    gsmSerial.begin(GSM_BAUD_RATE);
#endif
    gsm.begin();
    gsmPresent = (gsm.getStatus() == GSM_READY || gsm.getStatus() == GSM_SEARCHING_NETWORK);
    if (!gsmPresent) {
        Serial.println("[GSM] Notice: SIM800L not detected. Bypassing GSM queries to preserve CPU speed.");
    }

    // 6. Initialize Wi-Fi
    wifiManager.begin();
    wifiManager.setCommandCallback(handleRemoteCommand);

    Serial.println("[Init] Setup complete. Type 'HELP' for serial commands.");
}

void loop() {
    unsigned long currentMillis = millis();

    // Process serial terminal commands over USB
    handleSerialCommands();

    // 1. Maintain Wi-Fi connection
    wifiManager.update();

    // 2. Ultrasonic Sensor reading loop (runs every SENSOR_READ_INTERVAL_MS = 40ms, 25 scans/sec)
    if (currentMillis - lastSensorReadMillis >= SENSOR_READ_INTERVAL_MS) {
        lastSensorReadMillis = currentMillis;

        float distance = ultrasonic.readDistanceFiltered();

        // Print sensor readings periodically to Serial Monitor for real-time visibility
        static unsigned long lastDistanceLog = 0;
        if (currentMillis - lastDistanceLog >= 1500) {
            lastDistanceLog = currentMillis;
            if (distance > 0.0f) {
                if (dht.hasValidReading()) {
                    Serial.printf("[Sensor] Distance: %.1f cm (Status: %s) | DHT11: %.1f C, %.1f %%\n",
                                  distance,
                                  (distance <= security.getThreshold()) ? "INTRUDER DETECTED" : "SAFE",
                                  dht.getTemperature(), dht.getHumidity());
                } else {
                    Serial.printf("[Sensor] Distance: %.1f cm (Status: %s)\n",
                                  distance,
                                  (distance <= security.getThreshold()) ? "INTRUDER DETECTED" : "SAFE");
                }
            } else {
                Serial.println("[Sensor] Distance: Out of range or no echo (check HC-SR04 wiring)");
            }
        }

        // Process distance against security rules:
        // Distance > 30cm: SAFE (Green LED ON)
        // Distance <= 30cm: INTRUDER DETECTED (Red LED strobe, Police Siren, Relay ON)
        bool newAlarm = security.processReading(distance);

        if (newAlarm) {
            Serial.println("\n[ALERT] !!! INTRUDER DETECTED (Distance <= 30 cm) !!!");
            
            // ZERO-DELAY INSTANT HARDWARE RESPONSE:
            // Police siren, red warning strobe, and relay activate in 0 ms!
            actuators.setAlarm(true);

            // Queue cloud and SMS alert for background dispatch so loop() never freezes
            pendingAlertDispatch = true;
            pendingAlertDistance = distance;
            alertTriggerMillis = currentMillis;
        }
    }

    // 3. Update Actuator flashing/police siren states (Runs every loop iteration for smooth wail)
    actuators.update(security.isArmed(), security.isAlarmActive());

    // 4. Non-blocking Cloud Alert Dispatch:
    // Dispatched 80ms after physical alarm starts so the buzzer and strobe are already actively sounding
    if (pendingAlertDispatch && (currentMillis - alertTriggerMillis >= 80)) {
        pendingAlertDispatch = false;
        
        char desc[128];
        snprintf(desc, sizeof(desc), "Intruder detected at %.1f cm (threshold: %.1f cm)",
                 pendingAlertDistance, security.getThreshold());
        
        // Transmit security event to backend
        wifiManager.sendSecurityEvent(pendingAlertDistance, security.getThreshold(), "INTRUDER_ALERT", desc);

        // Dispatch SMS if GSM module is physically detected
        if (gsmPresent && gsm.canSendSMS()) {
            char smsMsg[160];
            snprintf(smsMsg, sizeof(smsMsg),
                "SECURITY ALERT: Intruder detected! Object at %.1f cm (Limit: %.1f cm). Check property immediately!",
                pendingAlertDistance, security.getThreshold()
            );
            gsm.sendSMS(ALERT_PHONE_NUMBER, smsMsg);
        }
    }

    // 5. Periodically check GSM status (every 30s) ONLY if GSM is present
    if (gsmPresent && (currentMillis - lastGsmCheckMillis >= 30000)) {
        lastGsmCheckMillis = currentMillis;
        gsm.checkStatus();
    }

    // 6. Send periodic Telemetry to Backend (only when not actively dispatching an alarm)
    if (!pendingAlertDispatch && (currentMillis - lastTelemetryMillis >= TELEMETRY_INTERVAL_MS)) {
        lastTelemetryMillis = currentMillis;

        // Sample DHT11 only once per telemetry interval (preserves CPU for ultrasonic sensor)
        dht.read();

        const char* stateStr = "DISARMED";
        if (security.getState() == STATE_ARMED_NORMAL) stateStr = "SAFE_ARMED";
        else if (security.getState() == STATE_ALARM_TRIGGERED) stateStr = "INTRUDER_DETECTED";

        const char* gsmStatusStr = gsmPresent ? "READY" : "NOT_CONNECTED";

        SystemTelemetryData telemetry;
        telemetry.distanceCm = security.getLastDistance();
        telemetry.thresholdCm = security.getThreshold();
        telemetry.securityState = stateStr;
        telemetry.buzzerState = actuators.isBuzzerActive();
        telemetry.relayState = actuators.isRelayActive();
        telemetry.redLedState = actuators.isRedLedActive();
        telemetry.greenLedState = actuators.isGreenLedActive();
        telemetry.gsmStatus = gsmStatusStr;
        telemetry.gsmRssi = gsmPresent ? gsm.getSignalQuality() : 0;
        telemetry.wifiRssi = wifiManager.getRSSI();
        telemetry.isArmed = security.isArmed();
        telemetry.isAlarm = security.isAlarmActive();
        telemetry.temperature = dht.hasValidReading() ? dht.getTemperature() : -999.0f;
        telemetry.humidity = dht.hasValidReading() ? dht.getHumidity() : -999.0f;

        String serverResponse = "";
        wifiManager.sendTelemetry(telemetry, serverResponse);
    }

    // Yield CPU to allow ESP8266 background Wi-Fi and TCP/IP stack to process
    yield();
}
