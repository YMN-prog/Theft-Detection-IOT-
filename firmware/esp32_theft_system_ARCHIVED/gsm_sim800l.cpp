#include "gsm_sim800l.h"

GSMModule::GSMModule(HardwareSerial &serialPort, uint8_t rxPin, uint8_t txPin, uint8_t rstPin)
    : _serial(serialPort), _rxPin(rxPin), _txPin(txPin), _rstPin(rstPin),
      _currentStatus(GSM_UNINITIALIZED), _lastSmsMillis(0), _cooldownActive(false) {}

void GSMModule::begin(unsigned long baudRate) {
    if (_rstPin != 255) {
        pinMode(_rstPin, OUTPUT);
        digitalWrite(_rstPin, HIGH); // Inactive
    }

    _serial.begin(baudRate, SERIAL_8N1, _rxPin, _txPin);
    delay(1000);
    flushBuffer();

    Serial.println("[GSM] Initializing SIM800L module on UART2...");
    checkStatus();
}

void GSMModule::resetHardware() {
    if (_rstPin == 255) return;
    Serial.println("[GSM] Performing hardware reset on SIM800L...");
    digitalWrite(_rstPin, LOW);
    delay(150);
    digitalWrite(_rstPin, HIGH);
    delay(3000); // Allow module boot time
    flushBuffer();
}

void GSMModule::flushBuffer() {
    while (_serial.available()) {
        _serial.read();
    }
}

bool GSMModule::sendATCommand(const String &cmd, const String &expectedReply, unsigned long timeoutMs) {
    flushBuffer();
    _serial.println(cmd);

    unsigned long start = millis();
    String response = "";

    while (millis() - start < timeoutMs) {
        while (_serial.available()) {
            char c = (char)_serial.read();
            response += c;
            if (response.indexOf(expectedReply) != -1) {
                return true;
            }
        }
        delay(10);
    }

    return false;
}

String GSMModule::sendATCommandWithResponse(const String &cmd, unsigned long timeoutMs) {
    flushBuffer();
    _serial.println(cmd);

    unsigned long start = millis();
    String response = "";

    while (millis() - start < timeoutMs) {
        while (_serial.available()) {
            char c = (char)_serial.read();
            response += c;
        }
        delay(10);
    }

    return response;
}

bool GSMModule::isAlive() {
    // Try up to 3 times to sync with baud
    for (int i = 0; i < 3; i++) {
        if (sendATCommand("AT", "OK", 1000)) {
            return true;
        }
        delay(200);
    }
    return false;
}

bool GSMModule::isSimReady() {
    String reply = sendATCommandWithResponse("AT+CPIN?", 2000);
    return reply.indexOf("READY") != -1;
}

int GSMModule::getSignalQuality() {
    String reply = sendATCommandWithResponse("AT+CSQ", 2000);
    int csqIdx = reply.indexOf("+CSQ: ");
    if (csqIdx != -1) {
        int commaIdx = reply.indexOf(',', csqIdx);
        if (commaIdx != -1) {
            String rssiStr = reply.substring(csqIdx + 6, commaIdx);
            rssiStr.trim();
            int rssi = rssiStr.toInt();
            if (rssi != 99) {
                return rssi; // 0 to 31
            }
        }
    }
    return -1;
}

bool GSMModule::isNetworkRegistered() {
    String reply = sendATCommandWithResponse("AT+CREG?", 2000);
    // +CREG: 0,1 (Registered, home network) or +CREG: 0,5 (Registered, roaming)
    return (reply.indexOf(",1") != -1 || reply.indexOf(",5") != -1);
}

GSMStatus GSMModule::checkStatus() {
    if (!isAlive()) {
        _currentStatus = GSM_NO_RESPONSE;
        Serial.println("[GSM] Status: NO_RESPONSE (Check 4V power and RX/TX wiring!)");
        return _currentStatus;
    }

    if (!isSimReady()) {
        _currentStatus = GSM_SIM_ERROR;
        Serial.println("[GSM] Status: SIM_ERROR (Check SIM card inserted & PIN unlocked)");
        return _currentStatus;
    }

    if (!isNetworkRegistered()) {
        _currentStatus = GSM_SEARCHING_NETWORK;
        Serial.println("[GSM] Status: SEARCHING_NETWORK (Waiting for cell tower registration...)");
        return _currentStatus;
    }

    _currentStatus = GSM_READY;
    int rssi = getSignalQuality();
    Serial.printf("[GSM] Status: READY (Registered on cellular network! RSSI: %d/31)\n", rssi);
    return _currentStatus;
}

bool GSMModule::canSendSMS() const {
    if (_lastSmsMillis == 0) return true;
    return (millis() - _lastSmsMillis >= GSM_SMS_COOLDOWN_MS);
}

unsigned long GSMModule::getSecondsUntilNextSMS() const {
    if (canSendSMS()) return 0;
    unsigned long elapsed = millis() - _lastSmsMillis;
    if (elapsed >= GSM_SMS_COOLDOWN_MS) return 0;
    return (GSM_SMS_COOLDOWN_MS - elapsed) / 1000;
}

bool GSMModule::sendSMS(const String &phoneNumber, const String &message) {
    if (!canSendSMS()) {
        Serial.printf("[GSM] SMS Throttled: Cooldown active (%lu sec remaining to prevent spam)\n", 
                      getSecondsUntilNextSMS());
        return false;
    }

    Serial.printf("[GSM] Preparing to send emergency SMS to: %s\n", phoneNumber.c_str());

    // 1. Set SMS text mode
    if (!sendATCommand("AT+CMGF=1", "OK", 2000)) {
        Serial.println("[GSM] Failed to set AT+CMGF=1");
        return false;
    }

    // 2. Initiate SMS command
    flushBuffer();
    _serial.print("AT+CMGS=\"");
    _serial.print(phoneNumber);
    _serial.println("\"");

    // Wait for the '>' prompt
    unsigned long start = millis();
    bool gotPrompt = false;
    while (millis() - start < 5000) {
        if (_serial.available()) {
            char c = (char)_serial.read();
            if (c == '>') {
                gotPrompt = true;
                break;
            }
        }
        delay(10);
    }

    if (!gotPrompt) {
        Serial.println("[GSM] Error: Did not receive '>' prompt from SIM800L");
        // Send ESC (0x1B) to cancel prompt if hanging
        _serial.write(0x1B);
        return false;
    }

    // 3. Send message content followed by Ctrl+Z (0x1A)
    _serial.print(message);
    _serial.write(0x1A);

    // 4. Wait for "+CMGS:" confirmation and "OK" (can take up to 20 seconds on cellular network)
    start = millis();
    String response = "";
    bool success = false;

    while (millis() - start < 25000) {
        while (_serial.available()) {
            char c = (char)_serial.read();
            response += c;
            if (response.indexOf("OK") != -1 && response.indexOf("+CMGS") != -1) {
                success = true;
                break;
            }
            if (response.indexOf("ERROR") != -1) {
                success = false;
                break;
            }
        }
        if (success || response.indexOf("ERROR") != -1) break;
        delay(20);
    }

    if (success) {
        _lastSmsMillis = millis();
        Serial.println("[GSM] SMS Successfully dispatched to network!");
        return true;
    } else {
        Serial.printf("[GSM] SMS Failed to send! Response: %s\n", response.c_str());
        return false;
    }
}
