#include "gsm_sim800l.h"

GSMModule::GSMModule(Stream &serialPort, uint8_t rstPin)
    : _serial(serialPort), _rstPin(rstPin),
      _currentStatus(GSM_UNINITIALIZED), _lastSmsMillis(0), _cooldownActive(false) {}

void GSMModule::begin() {
    if (_rstPin != 255) {
        pinMode(_rstPin, OUTPUT);
        digitalWrite(_rstPin, HIGH); // Inactive
    }

    delay(500);
    flushBuffer();

    Serial.println("[GSM] Initializing SIM800L module...");
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
        yield();
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
        yield();
    }

    return response;
}

bool GSMModule::isAlive() {
    for (int i = 0; i < 2; i++) {
        if (sendATCommand("AT", "OK", 300)) {
            return true;
        }
        delay(50);
        yield();
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
    return (reply.indexOf(",1") != -1 || reply.indexOf(",5") != -1);
}

GSMStatus GSMModule::checkStatus() {
    if (!isAlive()) {
        _currentStatus = GSM_NO_RESPONSE;
        Serial.println("[GSM] Status: NO_RESPONSE (Check 4.0V 2A external power and TX/RX wiring!)");
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
    Serial.printf("[GSM] Status: READY (Registered on cell network! RSSI: %d/31)\n", rssi);
    return _currentStatus;
}

bool GSMModule::canSendSMS() const {
    if (_currentStatus != GSM_READY) return false;
    if (_lastSmsMillis == 0) return true;
    return (millis() - _lastSmsMillis >= GSM_SMS_COOLDOWN_MS);
}

unsigned long GSMModule::getSecondsUntilNextSMS() const {
    if (!canSendSMS()) {
        if (_currentStatus != GSM_READY) return 0;
    }
    unsigned long elapsed = millis() - _lastSmsMillis;
    if (elapsed >= GSM_SMS_COOLDOWN_MS) return 0;
    return (GSM_SMS_COOLDOWN_MS - elapsed) / 1000;
}

bool GSMModule::sendSMS(const String &phoneNumber, const String &message) {
    if (_currentStatus != GSM_READY) {
        Serial.println("[GSM] Notice: SIM800L not connected or not ready. Alert processed via Wi-Fi only.");
        return false;
    }
    if (!canSendSMS()) {
        Serial.printf("[GSM] SMS Throttled: Cooldown active (%lu sec remaining)\n", 
                      getSecondsUntilNextSMS());
        return false;
    }

    Serial.printf("[GSM] Sending emergency SMS to: %s\n", phoneNumber.c_str());

    if (!sendATCommand("AT+CMGF=1", "OK", 2000)) {
        Serial.println("[GSM] Failed to set AT+CMGF=1");
        return false;
    }

    flushBuffer();
    _serial.print("AT+CMGS=\"");
    _serial.print(phoneNumber);
    _serial.println("\"");

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
        yield();
    }

    if (!gotPrompt) {
        Serial.println("[GSM] Error: Did not receive '>' prompt from SIM800L");
        _serial.write(0x1B); // Send ESC to cancel
        return false;
    }

    _serial.print(message);
    _serial.write(0x1A); // Send Ctrl+Z

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
        yield();
    }

    if (success) {
        _lastSmsMillis = millis();
        Serial.println("[GSM] SMS successfully sent to cellular carrier!");
        return true;
    } else {
        Serial.printf("[GSM] SMS Failed! Response: %s\n", response.c_str());
        return false;
    }
}
