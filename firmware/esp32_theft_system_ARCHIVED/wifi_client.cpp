#include "wifi_client.h"

WiFiManager::WiFiManager(const char* ssid, const char* password, const char* backendUrl)
    : _ssid(ssid), _password(password), _backendUrl(backendUrl),
      _lastReconnectAttempt(0), _commandCallback(nullptr) {}

void WiFiManager::begin() {
    Serial.printf("[WiFi] Initializing Wi-Fi station mode. Connecting to '%s'...\n", _ssid);
    WiFi.mode(WIFI_STA);
    WiFi.begin(_ssid, _password);
    _lastReconnectAttempt = millis();
}

void WiFiManager::update() {
    if (WiFi.status() != WL_CONNECTED) {
        unsigned long currentMillis = millis();
        if (currentMillis - _lastReconnectAttempt >= WIFI_RECONNECT_INTERVAL) {
            _lastReconnectAttempt = currentMillis;
            Serial.println("[WiFi] Wi-Fi lost or reconnecting... Attempting reconnect.");
            WiFi.disconnect();
            WiFi.begin(_ssid, _password);
        }
    }
}

bool WiFiManager::isConnected() {
    return WiFi.status() == WL_CONNECTED;
}

String WiFiManager::getLocalIP() {
    if (isConnected()) {
        return WiFi.localIP().toString();
    }
    return "0.0.0.0";
}

int WiFiManager::getRSSI() {
    if (isConnected()) {
        return WiFi.RSSI();
    }
    return -100;
}

bool WiFiManager::sendTelemetry(const SystemTelemetryData &data, String &outServerResponse) {
    if (!isConnected()) {
        return false;
    }

    HTTPClient http;
    String endpoint = _backendUrl + BACKEND_TELEMETRY_PATH;

    if (!http.begin(endpoint)) {
        Serial.printf("[HTTP] Failed to begin HTTP client for %s\n", endpoint.c_str());
        return false;
    }

    http.addHeader("Content-Type", "application/json");
    http.setTimeout(2500); // 2.5s timeout

    // Build JSON payload manually without bulky JSON libraries
    char payload[384];
    snprintf(payload, sizeof(payload),
        "{\"distance\":%.1f,\"threshold\":%.1f,\"state\":\"%s\",\"armed\":%s,"
        "\"alarm\":%s,\"buzzer\":%s,\"relay\":%s,\"redLed\":%s,\"greenLed\":%s,"
        "\"gsmStatus\":\"%s\",\"gsmRssi\":%d,\"wifiRssi\":%d,\"ip\":\"%s\"}",
        data.distanceCm, data.thresholdCm, data.securityState,
        data.isArmed ? "true" : "false",
        data.isAlarm ? "true" : "false",
        data.buzzerState ? "true" : "false",
        data.relayState ? "true" : "false",
        data.redLedState ? "true" : "false",
        data.greenLedState ? "true" : "false",
        data.gsmStatus, data.gsmRssi, data.wifiRssi,
        WiFi.localIP().toString().c_str()
    );

    int httpResponseCode = http.POST((uint8_t*)payload, strlen(payload));
    bool success = false;

    if (httpResponseCode > 0) {
        if (httpResponseCode >= 200 && httpResponseCode < 300) {
            outServerResponse = http.getString();
            parseServerCommands(outServerResponse);
            success = true;
        } else {
            Serial.printf("[HTTP] Telemetry POST returned HTTP code: %d\n", httpResponseCode);
        }
    } else {
        Serial.printf("[HTTP] Telemetry POST failed, error: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();
    return success;
}

bool WiFiManager::sendSecurityEvent(float distanceCm, float thresholdCm, const String &eventType, const String &description) {
    if (!isConnected()) {
        Serial.println("[HTTP] Cannot send security event: Wi-Fi offline");
        return false;
    }

    HTTPClient http;
    String endpoint = _backendUrl + BACKEND_EVENT_PATH;

    if (!http.begin(endpoint)) {
        return false;
    }

    http.addHeader("Content-Type", "application/json");
    http.setTimeout(3000);

    char payload[300];
    snprintf(payload, sizeof(payload),
        "{\"type\":\"%s\",\"distance\":%.1f,\"threshold\":%.1f,\"description\":\"%s\",\"timestamp\":%lu}",
        eventType.c_str(), distanceCm, thresholdCm, description.c_str(), millis()
    );

    int httpResponseCode = http.POST((uint8_t*)payload, strlen(payload));
    bool success = (httpResponseCode >= 200 && httpResponseCode < 300);

    if (success) {
        Serial.println("[HTTP] Security event dispatched to backend successfully.");
    } else {
        Serial.printf("[HTTP] Security event POST failed, code: %d\n", httpResponseCode);
    }

    http.end();
    return success;
}

void WiFiManager::parseServerCommands(const String &jsonResponse) {
    if (_commandCallback == nullptr || jsonResponse.length() == 0) return;

    // Check for arm/disarm command
    if (jsonResponse.indexOf("\"action\":\"arm\"") != -1) {
        _commandCallback("arm", 0);
    } else if (jsonResponse.indexOf("\"action\":\"disarm\"") != -1) {
        _commandCallback("disarm", 0);
    } else if (jsonResponse.indexOf("\"action\":\"reset\"") != -1) {
        _commandCallback("reset", 0);
    }

    // Check for threshold update command
    int threshIdx = jsonResponse.indexOf("\"setThreshold\":");
    if (threshIdx != -1) {
        float val = jsonResponse.substring(threshIdx + 15).toFloat();
        if (val > 0) {
            _commandCallback("setThreshold", val);
        }
    }
}
