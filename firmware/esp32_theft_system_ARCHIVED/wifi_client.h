#ifndef WIFI_CLIENT_H
#define WIFI_CLIENT_H

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "config.h"

struct SystemTelemetryData {
    float distanceCm;
    float thresholdCm;
    const char* securityState;
    bool buzzerState;
    bool relayState;
    bool redLedState;
    bool greenLedState;
    const char* gsmStatus;
    int gsmRssi;
    int wifiRssi;
    bool isArmed;
    bool isAlarm;
};

// Callback type for receiving remote commands from backend
typedef void (*CommandCallback)(const String &cmd, float value);

class WiFiManager {
public:
    WiFiManager(const char* ssid, const char* password, const char* backendUrl);
    void begin();
    
    // Call in loop to handle non-blocking auto-reconnect
    void update();

    bool isConnected();
    String getLocalIP();
    int getRSSI();

    // Send regular telemetry data to backend. Returns true if HTTP 200/201.
    bool sendTelemetry(const SystemTelemetryData &data, String &outServerResponse);

    // Send an immediate theft security event
    bool sendSecurityEvent(float distanceCm, float thresholdCm, const String &eventType, const String &description);

    void setCommandCallback(CommandCallback cb) { _commandCallback = cb; }

private:
    const char* _ssid;
    const char* _password;
    String _backendUrl;
    unsigned long _lastReconnectAttempt;
    CommandCallback _commandCallback;

    void parseServerCommands(const String &jsonResponse);
};

#endif // WIFI_CLIENT_H
