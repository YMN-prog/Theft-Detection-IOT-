#ifndef DHT11_H
#define DHT11_H

#include <Arduino.h>

class DHT11Sensor {
public:
    explicit DHT11Sensor(uint8_t pin);
    void begin();

    // Attempts to read temperature and humidity. Returns true if valid CRC.
    // If sensor is absent, times out within ~2ms and returns false without blocking.
    bool read();

    float getTemperature() const { return _hasValidReading ? _temperature : -999.0f; }
    float getHumidity() const    { return _hasValidReading ? _humidity : -999.0f; }
    bool hasValidReading() const { return _hasValidReading; }

private:
    uint8_t _pin;
    float _temperature;
    float _humidity;
    bool _hasValidReading;
    unsigned long _lastReadMillis;
};

#endif // DHT11_H
