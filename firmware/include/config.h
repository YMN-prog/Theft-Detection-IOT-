#ifndef CONFIG_H
#define CONFIG_H

/**
 * ============================================================================
 * SYSTEM USER CONFIGURATION (NodeMCU ESP8266 ESP-12E)
 * Project: ESP8266 IoT Theft Detection System
 * ============================================================================
 */

// --- Wi-Fi Network Credentials ---
// Enter your 2.4 GHz Wi-Fi router credentials (ESP8266 does not support 5 GHz)
#define WIFI_SSID               "Jiofiber"
#define WIFI_PASSWORD           "9527300033"
#define WIFI_RECONNECT_INTERVAL 5000 // Milliseconds between Wi-Fi reconnect attempts

// --- Backend API Configuration ---
// IP address of computer running the Node.js backend (e.g. "http://192.168.1.50:5000")
#define BACKEND_BASE_URL        "https://theft-detection-iot.onrender.com"
#define BACKEND_TELEMETRY_PATH  "/api/telemetry"
#define BACKEND_EVENT_PATH      "/api/events"
#define BACKEND_CONFIG_PATH     "/api/system/config"
// --- SIM800L GSM Configuration ---
#define ALERT_PHONE_NUMBER      "+919322992469"
#define GSM_BAUD_RATE           9600
#define GSM_SMS_COOLDOWN_MS     60000

// --- Theft Detection Parameters ---
// Distance > 30.0 cm : SAFE
// Distance <= 30.0 cm: INTRUDER DETECTED
#define DEFAULT_DISTANCE_THRESHOLD_CM 30.0f

// Number of consecutive readings below threshold required to confirm detection (1 = instant attack)
#define CONFIRMATION_SAMPLES          1

// Interval between ultrasonic sensor pings (in milliseconds) - 40ms = 25 scans/sec for instant zero-delay response
#define SENSOR_READ_INTERVAL_MS       40

// Duration the buzzer and relay remain active once triggered (in milliseconds)
#define ALARM_ACTIVE_DURATION_MS      20000 // 20 seconds before auto-silencing if intruder clears

// Cloud telemetry interval (5 seconds preserves CPU for instant real-time sensor detection)
#define TELEMETRY_INTERVAL_MS         5000

// --- Serial Debugging ---
#define DEBUG_BAUD_RATE         115200

#endif // CONFIG_H
