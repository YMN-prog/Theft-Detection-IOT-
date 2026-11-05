#ifndef ACTUATORS_H
#define ACTUATORS_H

#include <Arduino.h>
#include "firmware_pin_config.h"

class ActuatorController {
public:
    ActuatorController();
    void begin();

    // Call regularly in loop() for non-blocking LED blinking & buzzer pulsing
    void update(bool isArmed, bool isAlarmActive);

    // Immediate manual overrides or states
    void setAlarm(bool active);
    void setBuzzer(bool state);
    void setRelay(bool state);
    void setRedLed(bool state);
    void setGreenLed(bool state);

    // Testing self-test routine
    void selfTest();

    bool isAlarmActive() const { return _alarmActive; }
    bool isRelayActive() const { return _relayState; }
    bool isBuzzerActive() const { return _buzzerState; }
    bool isRedLedActive() const { return _redLedState; }
    bool isGreenLedActive() const { return _greenLedState; }

private:
    bool _alarmActive;
    bool _relayState;
    bool _buzzerState;
    bool _redLedState;
    bool _greenLedState;
    unsigned long _lastBlinkMillis;
    bool _blinkToggle;
};

#endif // ACTUATORS_H
