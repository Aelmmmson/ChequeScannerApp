# Cheque Scanner App - Automated Installation Script
# Version 1.0
# This script installs all prerequisites for the Cheque Scanner Application

#Requires -RunAsAdministrator

param(
    [string]$BaseDir = "$env:USERPROFILE\ChequeScannerApp",
    [string]$PythonVersion = "3.10.0",
    [string]$TesseractInstaller = "$env:USERPROFILE\Downloads\tesseract-setup.exe"
)

# Color functions for better UI
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Section {
    param([string]$Title)
    Write-ColorOutput "`n========================================" "Cyan"
    Write-ColorOutput " $Title" "Cyan"
    Write-ColorOutput "========================================`n" "Cyan"
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "✓ $Message" "Yellow"
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✓ $Message" "Green"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "✗ ERROR: $Message" "Red"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠ WARNING: $Message" "Yellow"
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "  $Message" "Gray"
}

function Test-CommandExists {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop > $null
        return $true
    } catch {
        return $false
    }
}

function Test-Admin {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check for Administrator privileges
if (-not (Test-Admin)) {
    Write-Error "This script must be run as Administrator"
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

Write-Section "Cheque Scanner App - Automated Installation"
Write-Info "Base Directory: $BaseDir"
Write-Info "Starting installation at $(Get-Date)"
Write-Host ""

# Create base directory
if (-not (Test-Path $BaseDir)) {
    New-Item -ItemType Directory -Path $BaseDir -Force | Out-Null
    Write-Info "Created base directory: $BaseDir"
}

# ============================================
# Step 1: Install Visual C++ Redistributables (Prerequisite)
# ============================================
Write-Section "Step 1: Installing Visual C++ Redistributables"

$vcRedistUrl = "https://aka.ms/vs/17/release/vc_redist.x86.exe"
$vcRedistInstaller = "$env:TEMP\vc_redist.x86.exe"

try {
    Write-Step "Downloading Visual C++ Redistributable..."
    Invoke-WebRequest -Uri $vcRedistUrl -OutFile $vcRedistInstaller -UseBasicParsing
    
    Write-Step "Installing Visual C++ Redistributable (silent)..."
    Start-Process -FilePath $vcRedistInstaller -ArgumentList "/install /quiet /norestart" -Wait
    Write-Success "Visual C++ Redistributable installed"
} catch {
    Write-Warning "Failed to download/install VC++ Redistributable: $_"
    Write-Info "Please manually install from: $vcRedistUrl"
}

# ============================================
# Step 2: Install Node.js LTS
# ============================================
Write-Section "Step 2: Installing Node.js LTS"

$nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
$nodeInstaller = "$env:TEMP\nodejs.msi"

if (-not (Test-CommandExists "node")) {
    try {
        Write-Step "Downloading Node.js..."
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller -UseBasicParsing
        
        Write-Step "Installing Node.js (silent)..."
        Start-Process -FilePath "msiexec" -ArgumentList "/i `"$nodeInstaller`" /quiet /norestart" -Wait
        Write-Success "Node.js installed"
        
        # Refresh environment
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } catch {
        Write-Error "Failed to install Node.js: $_"
        Write-Info "Please manually install from: $nodeUrl"
    }
} else {
    $nodeVersion = node --version
    Write-Success "Node.js already installed (Version: $nodeVersion)"
}

# ============================================
# Step 3: Install .NET 6.0 SDK (x86/32-bit)
# ============================================
Write-Section "Step 3: Installing .NET 6.0 SDK (x86/32-bit)"

$dotnetUrl = "https://download.visualstudio.microsoft.com/download/pr/445c7b39-166f-42a1-9a74-9840ef4dd0e4/ca1277a83d47ad9b5f4bc1c49aa5c46c/dotnet-sdk-6.0.428-win-x86.exe"
$dotnetInstaller = "$env:TEMP\dotnet-sdk-x86.exe"

if (-not (Test-CommandExists "dotnet")) {
    try {
        Write-Step "Downloading .NET 6.0 SDK x86..."
        Invoke-WebRequest -Uri $dotnetUrl -OutFile $dotnetInstaller -UseBasicParsing
        
        Write-Step "Installing .NET 6.0 SDK x86 (silent)..."
        Start-Process -FilePath $dotnetInstaller -ArgumentList "/install /quiet /norestart" -Wait
        Write-Success ".NET 6.0 SDK x86 installed"
        
        # Refresh environment
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } catch {
        Write-Error "Failed to install .NET SDK: $_"
        Write-Info "Please manually install from: $dotnetUrl"
        Write-Info "CRITICAL: Must install x86 (32-bit) version, not x64!"
    }
} else {
    $dotnetVersion = dotnet --version
    Write-Success ".NET SDK already installed (Version: $dotnetVersion)"
}

# ============================================
# Step 4: Install MagTek Excella STX Drivers
# ============================================
Write-Section "Step 4: Installing MagTek Excella STX Drivers"

$magtekUrl = "https://www.magtek.com/content/magtek/downloads/excella-stx/ExcellaSTX_Setup_V1.0.4.3.exe"
$magtekInstaller = "$env:TEMP\magtek-driver.exe"

# Check if scanner is already installed
$magtekDevice = Get-WmiObject -Class Win32_PnPEntity | Where-Object { $_.Name -match "Excella" }

if (-not $magtekDevice) {
    try {
        Write-Step "Downloading MagTek drivers..."
        Invoke-WebRequest -Uri $magtekUrl -OutFile $magtekInstaller -UseBasicParsing
        
        Write-Step "Installing MagTek drivers (silent)..."
        Start-Process -FilePath $magtekInstaller -ArgumentList "/quiet /norestart" -Wait
        Write-Success "MagTek drivers installed"
        Write-Info "Please connect MagTek Excella STX scanner via USB"
    } catch {
        Write-Warning "Failed to download/install MagTek drivers: $_"
        Write-Info "Please manually download from: https://www.magtek.com/support/excella-stx?tab=software"
    }
} else {
    Write-Success "MagTek Excella STX device detected"
}

# ============================================
# Step 5: Install MSXML 4.0 SP3
# ============================================
Write-Section "Step 5: Installing MSXML 4.0 SP3"

$msxmlUrl = "https://download.microsoft.com/download/2/8/1/28163F76-63E8-4C87-A1AA-FA38B45F07E0/msxml4-KB2758694-enu.exe"
$msxmlInstaller = "$env:TEMP\msxml4-installer.exe"
$msxmlExtractDir = "C:\msxml_extracted"

# Check if MSXML already exists
if (-not (Test-Path "C:\Windows\SysWOW64\msxml4.dll")) {
    try {
        Write-Step "Downloading MSXML 4.0..."
        Invoke-WebRequest -Uri $msxmlUrl -OutFile $msxmlInstaller -UseBasicParsing
        
        Write-Step "Extracting MSXML installer..."
        if (Test-Path $msxmlExtractDir) {
            Remove-Item -Path $msxmlExtractDir -Recurse -Force
        }
        New-Item -ItemType Directory -Path $msxmlExtractDir -Force | Out-Null
        
        # Extract the installer
        Start-Process -FilePath $msxmlInstaller -ArgumentList "/extract:`"$msxmlExtractDir`"" -Wait
        
        Write-Step "Installing MSXML 4.0..."
        $msxmlMsi = Get-ChildItem -Path $msxmlExtractDir -Filter "*.msi" | Select-Object -First 1
        if ($msxmlMsi) {
            Start-Process -FilePath "msiexec" -ArgumentList "/i `"$($msxmlMsi.FullName)`" /quiet /norestart" -Wait
        }
        
        Write-Step "Registering MSXML 4.0 DLL..."
        if (Test-Path "C:\Windows\SysWOW64\msxml4.dll") {
            regsvr32 /s "C:\Windows\SysWOW64\msxml4.dll"
            Write-Success "MSXML 4.0 installed and registered"
        }
    } catch {
        Write-Warning "Failed to install MSXML 4.0: $_"
        Write-Info "Please manually install from: $msxmlUrl"
    }
} else {
    Write-Success "MSXML 4.0 already installed"
}

# Clean up MSXML extraction
if (Test-Path $msxmlExtractDir) {
    Remove-Item -Path $msxmlExtractDir -Recurse -Force -ErrorAction SilentlyContinue
}

# ============================================
# Step 6: Install Tesseract OCR
# ============================================
Write-Section "Step 6: Installing Tesseract OCR"

$tesseractUrl = "https://github.com/UB-Mannheim/tesseract/releases/download/v5.3.3.20231005/tesseract-ocr-w64-setup-5.3.3.20231005.exe"

# Try to use provided installer path or download
if (Test-Path $TesseractInstaller) {
    $tesseractInstallerPath = $TesseractInstaller
    Write-Info "Using provided Tesseract installer: $TesseractInstaller"
} else {
    $tesseractInstallerPath = "$env:TEMP\tesseract-installer.exe"
    Write-Step "Downloading Tesseract OCR..."
    try {
        Invoke-WebRequest -Uri $tesseractUrl -OutFile $tesseractInstallerPath -UseBasicParsing
    } catch {
        Write-Warning "Failed to download Tesseract: $_"
        Write-Info "Please manually download from: $tesseractUrl"
        $tesseractInstallerPath = $null
    }
}

if ($tesseractInstallerPath -and (Test-Path $tesseractInstallerPath)) {
    if (-not (Test-CommandExists "tesseract")) {
        try {
            Write-Step "Installing Tesseract OCR (silent)..."
            Start-Process -FilePath $tesseractInstallerPath -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART" -Wait
            Write-Success "Tesseract OCR installed"
            
            # Add to PATH
            $tesseractPath = "C:\Program Files\Tesseract-OCR"
            if (Test-Path $tesseractPath) {
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
                Write-Success "Tesseract added to PATH"
            }
        } catch {
            Write-Warning "Failed to install Tesseract: $_"
            Write-Info "Please manually install from: $tesseractUrl"
        }
    } else {
        $tesseractVersion = tesseract --version 2>&1 | Select-Object -First 1
        Write-Success "Tesseract already installed ($tesseractVersion)"
    }
}

# ============================================
# Step 7: Install Python 3.10+
# ============================================
Write-Section "Step 8: Installing Python 3.10+"

$pythonUrl = "https://www.python.org/ftp/python/$PythonVersion/python-$PythonVersion-amd64.exe"
$pythonInstaller = "$env:TEMP\python-installer.exe"

if (-not (Test-CommandExists "python")) {
    try {
        Write-Step "Downloading Python $PythonVersion..."
        Invoke-WebRequest -Uri $pythonUrl -OutFile $pythonInstaller -UseBasicParsing
        
        Write-Step "Installing Python (silent with PATH)..."
        Start-Process -FilePath $pythonInstaller -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1" -Wait
        Write-Success "Python $PythonVersion installed"
        
        # Refresh environment
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } catch {
        Write-Error "Failed to install Python: $_"
        Write-Info "Please manually install from: $pythonUrl"
        Write-Info "Ensure 'Add Python to PATH' is checked during installation"
    }
} else {
    $pythonVersion = python --version
    Write-Success "Python already installed ($pythonVersion)"
}

# ============================================
# Step 9: Install Required Python Packages
# ============================================
Write-Section "Step 9: Installing Python Packages"

if (Test-CommandExists "python") {
    try {
        Write-Step "Upgrading pip..."
        python -m pip install --upgrade pip > $null 2>&1
        
        Write-Step "Installing Python packages..."
        $packages = @(
            "flask", "flask-cors", "pillow", "pytesseract", 
            "opencv-python", "numpy", "waitress", "requests"
        )
        
        foreach ($pkg in $packages) {
            Write-Info "  Installing $pkg..."
            pip install $pkg > $null 2>&1
        }
        Write-Success "Python packages installed"
    } catch {
        Write-Warning "Failed to install Python packages: $_"
        Write-Info "Please manually run: pip install flask flask-cors pillow pytesseract opencv-python numpy waitress requests"
    }
} else {
    Write-Warning "Python not found. Please install Python first."
}

# ============================================
# Step 10: Configure Core Isolation (Windows 11)
# ============================================
Write-Section "Step 10: Configuring Windows Settings"

# Check if Windows 11
$osVersion = (Get-CimInstance Win32_OperatingSystem).Version
$isWin11 = $osVersion -ge "10.0.22000"

if ($isWin11) {
    Write-Step "Checking Core Isolation settings (Windows 11)..."
    
    try {
        # Check Memory Integrity status
        $memoryIntegrity = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity" -Name "Enabled" -ErrorAction SilentlyContinue
        
        if ($memoryIntegrity -and $memoryIntegrity.Enabled -eq 1) {
            Write-Warning "Memory Integrity is enabled. This may block MagTek drivers."
            Write-Info "To disable, go to: Windows Security > Device Security > Core Isolation"
            Write-Info "Toggle 'Memory Integrity' to Off and restart your PC"
        } else {
            Write-Success "Memory Integrity is already disabled"
        }
    } catch {
        Write-Info "Cannot check Core Isolation settings. Please verify manually."
        Write-Info "Path: Windows Security > Device Security > Core Isolation > Memory Integrity"
    }
}

# ============================================
# Step 11: Final Configuration and Verification
# ============================================
Write-Section "Installation Complete - Verification"

# Verify installations
$verificationResults = @()

# Check Node.js
if (Test-CommandExists "node") {
    $verificationResults += "✓ Node.js: $(node --version)"
} else {
    $verificationResults += "✗ Node.js: NOT FOUND"
}

# Check .NET
if (Test-CommandExists "dotnet") {
    $verificationResults += "✓ .NET SDK: $(dotnet --version)"
} else {
    $verificationResults += "✗ .NET SDK: NOT FOUND"
}

# Check Python
if (Test-CommandExists "python") {
    $verificationResults += "✓ Python: $(python --version)"
} else {
    $verificationResults += "✗ Python: NOT FOUND"
}

# Check Tesseract
if (Test-CommandExists "tesseract") {
    $tesseractVer = tesseract --version 2>&1 | Select-Object -First 1
    $verificationResults += "✓ Tesseract: $tesseractVer"
} else {
    $verificationResults += "✗ Tesseract: NOT FOUND (Check PATH)"
}

# Check MSXML
if (Test-Path "C:\Windows\SysWOW64\msxml4.dll") {
    $verificationResults += "✓ MSXML 4.0: Installed"
} else {
    $verificationResults += "✗ MSXML 4.0: NOT FOUND"
}

# Display results
Write-Host "`nVerification Results:" -ForegroundColor Cyan
Write-Host "---------------------" -ForegroundColor Cyan
foreach ($result in $verificationResults) {
    if ($result -match "^✓") {
        Write-Host $result -ForegroundColor Green
    } else {
        Write-Host $result -ForegroundColor Red
    }
}

# ============================================
# Final Instructions
# ============================================
Write-Section "Next Steps"

Write-Host @"
To complete the setup and run the application:

1. CONNECT HARDWARE:
   - Connect MagTek Excella STX scanner via USB
   - Ensure power adapter is connected

2. RESTART YOUR PC (recommended to complete driver installations)

3. RUN THE APPLICATION (after restart):
   - Start Backend API: cd $BaseDir\backend\ScannerApi && dotnet run --configuration Release --runtime win-x86
   - Start Vision Engine: cd $BaseDir\backend\python_service && python app.py
   - Start Frontend: cd $BaseDir\frontend && npm run dev

4. ACCESS THE APPLICATION:
   - Open browser to: http://localhost:8080

5. TROUBLESHOOTING:
   - Run this script again if installations failed
   - Check Device Manager for MagTek Excella STX

"@ -ForegroundColor Yellow

Write-Host "Installation script completed!" -ForegroundColor Green
Write-Host "Press any key to exit..."
Read-Host