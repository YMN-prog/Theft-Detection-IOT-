<#
.SYNOPSIS
  Starts both Backend REST/WebSocket server and Frontend Dashboard concurrently
#>

$env:PATH = "C:\Users\SAINATH\AppData\Local\Programs\nodejs;C:\Users\SAINATH\AppData\Local\Programs\arduino-cli;" + $env:PATH

Write-Host "=========================================================="
Write-Host "Starting NodeMCU ESP8266 IoT Theft Detection System..."
Write-Host "=========================================================="

$backendDir = "d:\Theif detection system(IOT)\backend"
$frontendDir = "d:\Theif detection system(IOT)\frontend"

Write-Host "[1/2] Starting Backend Server (Port 5000)..."
$backendProcess = Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "`$env:PATH = 'C:\Users\SAINATH\AppData\Local\Programs\nodejs;C:\Users\SAINATH\AppData\Local\Programs\arduino-cli;' + `$env:PATH; cd '$backendDir'; npm.cmd run dev" -PassThru

Start-Sleep -Seconds 2

Write-Host "[2/2] Starting Frontend Dashboard (Port 5173)..."
$frontendProcess = Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "`$env:PATH = 'C:\Users\SAINATH\AppData\Local\Programs\nodejs;C:\Users\SAINATH\AppData\Local\Programs\arduino-cli;' + `$env:PATH; cd '$frontendDir'; npm.cmd run dev" -PassThru

Write-Host "`nServices launched!"
Write-Host "  Backend API:        http://localhost:5000"
Write-Host "  Frontend Dashboard: http://localhost:5173"
Write-Host "To shut down, close the spawned terminal windows."
