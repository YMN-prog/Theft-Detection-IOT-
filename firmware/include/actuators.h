#ifndef ACTUATORS_H
#define ACTUATORS_H

#include <Arduino.h>
#include "firmware_pin_config.h"

class ActuatorController {
public:
    ActuatorController();
    void begin();

    // Call regularly in loop() for non-blocking LED blinking & police siren tone
    void update(bool isArmed, bool isAlarmActive);

    // Immediate manual overrides or states
    void setAlarm(bool active);
    void setBuzzer(bool state);
    void setRelay(bool state);
    void setRedLed(bool state);
    void setGreenLed(bool state);

    // Green LED override: -1 = Auto (follows armed/safe), 0 = Force OFF, 1 = Force ON
    void setGreenLedOverride(int mode);
    int getGreenLedOverride() const { return _greenLedOverride; }

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
    int  _greenLedOverride; // -1: Auto, 0: Force OFF, 1: Force ON

    // Strobe and Siren timing
    unsigned long _lastStrobeMillis;
    bool _strobeToggle;
    unsigned long _lastSirenStepMillis;
    int _sirenFreq;
    bool _sirenRising;
    unsigned long _lastHeartbeatMillis;
    bool _heartbeatToggle;
};

#endif // ACTUATORS_H
