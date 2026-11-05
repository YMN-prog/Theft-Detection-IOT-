<#
.SYNOPSIS
  Compiles and flashes NodeMCU ESP8266 ESP-12E Firmware over USB using Arduino CLI
.PARAMETER Port
  The serial COM port (e.g. COM4). If not specified, auto-detects.
.PARAMETER Target
  Target sketch: 'main' (default), 'ultrasonic', 'actuators', 'gsm', 'wifi'
#>
param (
    [string]$Port = "",
    [string]$Target = "main"
)

$cli = "C:\Users\SAINATH\AppData\Local\Programs\arduino-cli\arduino-cli.exe"
if (!(Test-Path $cli)) {
    Write-Error "arduino-cli.exe not found at $cli."
    exit 1
}

# Auto-detect COM port if omitted
if ([string]::IsNullOrWhiteSpace($Port)) {
    Write-Host "[Flash] Scanning for connected NodeMCU ESP8266 COM port..."
    $ports = [System.IO.Ports.SerialPort]::getportnames()
    if ($ports.Count -eq 0) {
        Write-Error "No serial COM ports detected. Please connect NodeMCU via micro-USB cable."
        exit 1
    }
    # Pick the newest/highest COM port or non-COM3 if present
    $Port = ($ports | Where-Object { $_ -ne 'COM3' } | Select-Object -First 1)
    if ([string]::IsNullOrWhiteSpace($Port)) {
        $Port = $ports[0]
    }
    Write-Host "[Flash] Auto-selected COM port: $Port"
}

# Resolve target path
$sketchDir = ""
switch ($Target.ToLower()) {
    "ultrasonic" { $sketchDir = "d:\Theif detection system(IOT)\firmware\tests\test_ultrasonic" }
    "actuators"  { $sketchDir = "d:\Theif detection system(IOT)\firmware\tests\test_actuators" }
    "gsm"        { $sketchDir = "d:\Theif detection system(IOT)\firmware\tests\test_gsm_at" }
    "wifi"       { $sketchDir = "d:\Theif detection system(IOT)\firmware\tests\test_wifi" }
    default      { $sketchDir = "d:\Theif detection system(IOT)\firmware\nodemcu_theft_system" }
}

$fqbn = "esp8266:esp8266:nodemcuv2"
Write-Host "=========================================================="
Write-Host "Flashing Target: $Target ($sketchDir)"
Write-Host "Target FQBN:     $fqbn"
Write-Host "Upload Port:     $Port"
Write-Host "=========================================================="

Write-Host "`n[1/2] Compiling sketch..."
& $cli compile --fqbn $fqbn $sketchDir
if ($LASTEXITCODE -ne 0) {
    Write-Error "Compilation failed. Check code syntax or missing libraries."
    exit $LASTEXITCODE
}

Write-Host "`n[2/2] Uploading binary to NodeMCU ESP8266 over $Port..."
& $cli upload -p $Port --fqbn $fqbn $sketchDir
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Upload failed. If board is stuck, press and hold the 'FLASH' button on the NodeMCU while uploading."
    exit $LASTEXITCODE
}

Write-Host "`n[SUCCESS] Firmware successfully uploaded to NodeMCU on $Port!"
