<#
.SYNOPSIS
  Connects to NodeMCU ESP8266 Serial Monitor over USB at 115200 baud
.PARAMETER Port
  The serial COM port (e.g. COM4)
#>
param (
    [string]$Port = ""
)

$cli = "C:\Users\SAINATH\AppData\Local\Programs\arduino-cli\arduino-cli.exe"
if (!(Test-Path $cli)) {
    Write-Error "arduino-cli.exe not found at $cli."
    exit 1
}

if ([string]::IsNullOrWhiteSpace($Port)) {
    $ports = [System.IO.Ports.SerialPort]::getportnames()
    $Port = ($ports | Where-Object { $_ -ne 'COM3' } | Select-Object -First 1)
    if ([string]::IsNullOrWhiteSpace($Port)) {
        $Port = $ports[0]
    }
}

Write-Host "Opening Serial Monitor on $Port at 115200 baud... (Press Ctrl+C to exit)"
& $cli monitor -p $Port -c baudrate=115200
