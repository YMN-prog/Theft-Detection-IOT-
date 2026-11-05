#ifndef ULTRASONIC_H
#define ULTRASONIC_H

#include <Arduino.h>

class UltrasonicSensor {
public:
    UltrasonicSensor(uint8_t trigPin, uint8_t echoPin);
    void begin();
    
    // Reads raw distance in centimeters with timeout protection. Returns -1.0f on error/timeout.
    float readDistanceRaw();

    // Returns a filtered, smoothed distance reading using running median/average.
    float readDistanceFiltered();

private:
    uint8_t _trigPin;
    uint8_t _echoPin;
    static const int FILTER_WINDOW = 5;
    float _history[FILTER_WINDOW];
    int _historyIndex;
    bool _historyFilled;
};

#endif // ULTRASONIC_H
