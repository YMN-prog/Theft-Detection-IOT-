#ifndef CONFIG_H
#define CONFIG_H

/**
 * ============================================================================
 * SYSTEM USER CONFIGURATION
 * Project: ESP32 IoT Theft Detection System
 * ============================================================================
 */

// --- Wi-Fi Network Credentials ---
// Change these to match your local Wi-Fi router (2.4 GHz only; ESP32 does not support 5 GHz Wi-Fi)
#define WIFI_SSID               "YOUR_WIFI_SSID"
#define WIFI_PASSWORD           "YOUR_WIFI_PASSWORD"
#define WIFI_RECONNECT_INTERVAL 5000 // Milliseconds between Wi-Fi reconnect attempts

// --- Backend API Configuration ---
// Replace with the IP address of the machine running the Node.js backend
// e.g., "http://192.168.1.50:5000"
#define BACKEND_BASE_URL        "http://192.168.1.100:5000"
#define BACKEND_TELEMETRY_PATH  "/api/telemetry"
#define BACKEND_EVENT_PATH      "/api/events"
#define BACKEND_CONFIG_PATH     "/api/system/config"
#define TELEMETRY_INTERVAL_MS   1500 // Send distance & status every 1.5s

// --- SIM800L GSM Configuration ---
// Recipient emergency contact phone number with international country code (+...)
#define ALERT_PHONE_NUMBER      "+1234567890"
#define GSM_BAUD_RATE           9600
#define GSM_SMS_COOLDOWN_MS     60000 // Minimum 60 seconds between SMS to prevent spam/cost

// --- Theft Detection Parameters ---
// When distance falls BELOW this value (in centimeters) while Armed, theft is detected.
#define DEFAULT_DISTANCE_THRESHOLD_CM 35.0f

// Number of consecutive readings below threshold required to confirm detection (filters ultrasonic noise)
#define CONFIRMATION_SAMPLES          3

// Interval between ultrasonic sensor pings (in milliseconds)
#define SENSOR_READ_INTERVAL_MS       200

// Duration the buzzer and relay remain active once triggered (in milliseconds)
#define ALARM_ACTIVE_DURATION_MS      20000 // 20 seconds

// --- Serial Debugging ---
#define DEBUG_BAUD_RATE         115200

#endif // CONFIG_H
