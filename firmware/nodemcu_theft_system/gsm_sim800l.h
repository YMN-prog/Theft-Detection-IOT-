#ifndef GSM_SIM800L_H
#define GSM_SIM800L_H

#include <Arduino.h>
#include <Stream.h>
#include "firmware_pin_config.h"
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
    GSMModule(Stream &serialPort, uint8_t rstPin = 255);
    void begin();
    
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
    Stream &_serial;
    uint8_t _rstPin;
    GSMStatus _currentStatus;
    unsigned long _lastSmsMillis;
    bool _cooldownActive;

    void flushBuffer();
};

#endif // GSM_SIM800L_H
