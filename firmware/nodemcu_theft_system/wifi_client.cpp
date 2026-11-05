#include "wifi_client.h"

WiFiManager::WiFiManager(const char* ssid, const char* password, const char* backendUrl)
    : _ssid(ssid), _password(password), _backendUrl(backendUrl),
      _lastReconnectAttempt(0), _commandCallback(nullptr) {}

void WiFiManager::begin() {
    Serial.printf("[Wi-Fi] Connecting to SSID: %s ...\n", _ssid);
    WiFi.mode(WIFI_STA);
    WiFi.begin(_ssid, _password);

#if defined(ESP8266)
    // Allow HTTPS connections to cloud backends (Render, Vercel, AWS, etc.) without requiring a huge CA certificate
    _wifiClientSecure.setInsecure();
    _wifiClientSecure.setTimeout(3000);
#endif
}

void WiFiManager::update() {
    if (WiFi.status() == WL_CONNECTED) {
        return;
    }

    unsigned long currentMillis = millis();
    if (currentMillis - _lastReconnectAttempt >= WIFI_RECONNECT_INTERVAL) {
        _lastReconnectAttempt = currentMillis;
        Serial.println("[Wi-Fi] Attempting reconnection to AP...");
        WiFi.disconnect();
        WiFi.begin(_ssid, _password);
    }
}

bool WiFiManager::isConnected() {
    return WiFi.status() == WL_CONNECTED;
}

String WiFiManager::getLocalIP() {
    return isConnected() ? WiFi.localIP().toString() : "0.0.0.0";
}

int WiFiManager::getRSSI() {
    return isConnected() ? WiFi.RSSI() : -100;
}

bool WiFiManager::sendTelemetry(const SystemTelemetryData &data, String &outServerResponse) {
    if (!isConnected()) {
        return false;
    }

    HTTPClient http;
    String endpoint = _backendUrl + BACKEND_TELEMETRY_PATH;

#if defined(ESP8266)
    bool isHttps = _backendUrl.startsWith("https://");
    bool begun = false;
    if (isHttps) {
        begun = http.begin(_wifiClientSecure, endpoint);
    } else {
        begun = http.begin(_wifiClient, endpoint);
    }
    if (!begun) {
        Serial.printf("[HTTP] Failed to initialize connection to %s\n", endpoint.c_str());
        return false;
    }
#else
    if (!http.begin(endpoint)) {
        Serial.printf("[HTTP] Failed to initialize connection to %s\n", endpoint.c_str());
        return false;
    }
#endif

    http.addHeader("Content-Type", "application/json");
    http.setTimeout(3500);

    char tempBuf[32];
    char humBuf[32];
    if (data.temperature > -50.0f && data.temperature < 100.0f) {
        snprintf(tempBuf, sizeof(tempBuf), "%.1f", data.temperature);
    } else {
        strcpy(tempBuf, "null");
    }
    if (data.humidity >= 0.0f && data.humidity <= 100.0f) {
        snprintf(humBuf, sizeof(humBuf), "%.1f", data.humidity);
    } else {
        strcpy(humBuf, "null");
    }

    char payload[448];
    snprintf(payload, sizeof(payload),
        "{\"distance\":%.1f,\"threshold\":%.1f,\"state\":\"%s\",\"armed\":%s,"
        "\"alarm\":%s,\"buzzer\":%s,\"relay\":%s,\"redLed\":%s,\"greenLed\":%s,"
        "\"gsmStatus\":\"%s\",\"gsmRssi\":%d,\"wifiRssi\":%d,\"ip\":\"%s\","
        "\"temperature\":%s,\"humidity\":%s}",
        data.distanceCm, data.thresholdCm, data.securityState,
        data.isArmed ? "true" : "false",
        data.isAlarm ? "true" : "false",
        data.buzzerState ? "true" : "false",
        data.relayState ? "true" : "false",
        data.redLedState ? "true" : "false",
        data.greenLedState ? "true" : "false",
        data.gsmStatus, data.gsmRssi, data.wifiRssi,
        WiFi.localIP().toString().c_str(),
        tempBuf, humBuf
    );

    int httpResponseCode = http.POST((uint8_t*)payload, strlen(payload));
    bool success = false;

    if (httpResponseCode > 0) {
        if (httpResponseCode >= 200 && httpResponseCode < 300) {
            outServerResponse = http.getString();
            parseServerCommands(outServerResponse);
            success = true;
        } else {
            Serial.printf("[HTTP] Telemetry POST status: %d\n", httpResponseCode);
        }
    } else {
        Serial.printf("[HTTP] Telemetry POST error: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();
    return success;
}

bool WiFiManager::sendSecurityEvent(float distanceCm, float thresholdCm, const String &eventType, const String &description) {
    if (!isConnected()) {
        return false;
    }

    HTTPClient http;
    String endpoint = _backendUrl + BACKEND_EVENT_PATH;

#if defined(ESP8266)
    bool isHttps = _backendUrl.startsWith("https://");
    bool begun = false;
    if (isHttps) {
        begun = http.begin(_wifiClientSecure, endpoint);
    } else {
        begun = http.begin(_wifiClient, endpoint);
    }
    if (!begun) {
        return false;
    }
#else
    if (!http.begin(endpoint)) {
        return false;
    }
#endif

    http.addHeader("Content-Type", "application/json");
    http.setTimeout(4000);

    char payload[300];
    snprintf(payload, sizeof(payload),
        "{\"type\":\"%s\",\"distance\":%.1f,\"threshold\":%.1f,\"description\":\"%s\",\"timestamp\":%lu}",
        eventType.c_str(), distanceCm, thresholdCm, description.c_str(), millis()
    );

    int httpResponseCode = http.POST((uint8_t*)payload, strlen(payload));
    bool success = (httpResponseCode >= 200 && httpResponseCode < 300);

    if (success) {
        Serial.println("[HTTP] Security alert transmitted to backend.");
    } else {
        Serial.printf("[HTTP] Alert POST error: %d\n", httpResponseCode);
    }

    http.end();
    return success;
}

void WiFiManager::parseServerCommands(const String &jsonResponse) {
    if (_commandCallback == nullptr || jsonResponse.length() == 0) return;

    if (jsonResponse.indexOf("\"action\":\"arm\"") != -1) {
        _commandCallback("arm", 0);
    } else if (jsonResponse.indexOf("\"action\":\"disarm\"") != -1) {
        _commandCallback("disarm", 0);
    } else if (jsonResponse.indexOf("\"action\":\"reset\"") != -1) {
        _commandCallback("reset", 0);
    } else if (jsonResponse.indexOf("\"action\":\"greenOn\"") != -1) {
        _commandCallback("greenOn", 0);
    } else if (jsonResponse.indexOf("\"action\":\"greenOff\"") != -1) {
        _commandCallback("greenOff", 0);
    } else if (jsonResponse.indexOf("\"action\":\"greenAuto\"") != -1) {
        _commandCallback("greenAuto", 0);
    }

    int threshIdx = jsonResponse.indexOf("\"setThreshold\":");
    if (threshIdx != -1) {
        float val = jsonResponse.substring(threshIdx + 15).toFloat();
        if (val > 0) {
            _commandCallback("setThreshold", val);
        }
    }
}
