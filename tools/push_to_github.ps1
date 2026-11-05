<#
.SYNOPSIS
  Helper script to commit and push the IoT Intrusion Detection System project to GitHub.
#>
param (
    [string]$RepoUrl = "",
    [string]$GitUser = "",
    [string]$GitEmail = ""
)

$env:PATH = "C:\Users\SAINATH\AppData\Local\Programs\Git\cmd;" + $env:PATH
cd "d:\Theif detection system(IOT)"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Push Project to GitHub" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check Git configuration (name and email)
$currentName = git config user.name
$currentEmail = git config user.email

if ([string]::IsNullOrWhiteSpace($currentName)) {
    if ([string]::IsNullOrWhiteSpace($GitUser)) {
        $GitUser = Read-Host "Enter your Git Name (e.g. John Doe)"
    }
    git config --global user.name "$GitUser"
    Write-Host "Saved Git user.name: $GitUser" -ForegroundColor Green
} else {
    Write-Host "Git User: $currentName" -ForegroundColor Gray
}

if ([string]::IsNullOrWhiteSpace($currentEmail)) {
    if ([string]::IsNullOrWhiteSpace($GitEmail)) {
        $GitEmail = Read-Host "Enter your Git Email (e.g. yourname@gmail.com)"
    }
    git config --global user.email "$GitEmail"
    Write-Host "Saved Git user.email: $GitEmail" -ForegroundColor Green
} else {
    Write-Host "Git Email: $currentEmail" -ForegroundColor Gray
}

# 2. Stage all clean project files
Write-Host "`n[1/3] Staging project files..." -ForegroundColor Yellow
git branch -m main
git add .

# 3. Commit if there are changes
$status = git status --porcelain
if ($status) {
    Write-Host "`n[2/3] Creating commit..." -ForegroundColor Yellow
    git commit -m "Initial commit: NodeMCU ESP8266 IoT Intrusion Detection System with DHT11, Police Siren & React Dashboard"
    Write-Host "Commit created successfully!" -ForegroundColor Green
} else {
    Write-Host "`n[2/3] Repository is already up to date (no uncommitted changes)." -ForegroundColor Green
}

# 4. Configure Remote Repository URL
$remoteOrigin = git remote get-url origin 2>$null
if ([string]::IsNullOrWhiteSpace($remoteOrigin)) {
    if ([string]::IsNullOrWhiteSpace($RepoUrl)) {
        Write-Host "`nGo to https://github.com/new and create a new repository." -ForegroundColor Cyan
        Write-Host "Leave it empty (do NOT check 'Add README' or '.gitignore')." -ForegroundColor Cyan
        $RepoUrl = Read-Host "`nEnter your GitHub Repository URL (e.g. https://github.com/YourUsername/your-repo.git)"
    }
    if (![string]::IsNullOrWhiteSpace($RepoUrl)) {
        git remote add origin "$RepoUrl"
        Write-Host "Remote origin added: $RepoUrl" -ForegroundColor Green
    } else {
        Write-Warning "No repository URL provided. Skipping push."
        exit 0
    }
} else {
    Write-Host "`nRemote origin already configured: $remoteOrigin" -ForegroundColor Gray
}

# 5. Push to GitHub
Write-Host "`n[3/3] Pushing to GitHub (main branch)..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host "  SUCCESS! Project pushed to GitHub successfully!" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    Write-Host "`nIf prompted, log in with your GitHub credentials or Personal Access Token (PAT)." -ForegroundColor Yellow
}
