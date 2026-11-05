#ifndef GSM_SIM800L_H
#define GSM_SIM800L_H

#include <Arduino.h>
#include <HardwareSerial.h>
#include "pins.h"
#include "config.h"

enum GSMStatus {
    GSM_UNINITIALIZED,
    GSM_NO_RESPONSE,
    GSM_SIM_ERROR,
    GSM_SEARCHING_NETWORK,
    GSM_READY
};

class GSMModule {
public:
    GSMModule(HardwareSerial &serialPort, uint8_t rxPin, uint8_t txPin, uint8_t rstPin);
    void begin(unsigned long baudRate = GSM_BAUD_RATE);
    
    // Hardware reset pulse if RST pin connected
    void resetHardware();

    // Health and status checks
    bool sendATCommand(const String &cmd, const String &expectedReply, unsigned long timeoutMs = 2000);
    String sendATCommandWithResponse(const String &cmd, unsigned long timeoutMs = 2000);

    bool isAlive();
    bool isSimReady();
    int getSignalQuality(); // Returns 0-31, or -1 on error
    bool isNetworkRegistered();
    GSMStatus checkStatus();

    // SMS transmission with spam cooldown guard
    bool sendSMS(const String &phoneNumber, const String &message);

    // Checks whether an SMS can be sent now or is throttled by cooldown
    bool canSendSMS() const;
    unsigned long getSecondsUntilNextSMS() const;

    GSMStatus getStatus() const { return _currentStatus; }
    unsigned long getLastSMSTime() const { return _lastSmsMillis; }

private:
    HardwareSerial &_serial;
    uint8_t _rxPin;
    uint8_t _txPin;
    uint8_t _rstPin;
    GSMStatus _currentStatus;
    unsigned long _lastSmsMillis;
    bool _cooldownActive;

    void flushBuffer();
};

#endif // GSM_SIM800L_H
