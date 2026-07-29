# Cheque Scanner App - System Setup & Running Guide

This guide is designed for both technical and non-technical users to set up, configure, and run the Cheque Scanner Application from scratch.

It covers physical hardware connections, software prerequisites, system configurations, executing the application servers, capturing signatures via Topaz pad, and performing end-to-end cheque scanning.

---

## 1. System Requirements


### Hardware Requirements

1. **MagTek Excella STX Scanner** (specifically model Excella STX USB/Ethernet) + **Power Adapter** and **USB 2.0 A-to-B Cable**.

2. **Topaz Signature Pad** (Topaz SigLite / SignatureGem models e.g., `T-S460`, `T-L462`, or `T-S751` USB pad) + **USB Cable**.

3. **Sample Cheque** loaded into the scanner manual feed throat.


### PC & Network Requirements

1. **Operating System:** Windows 10 or Windows 11 (64-bit).

2. **Network Connection:** Active network access to:
   - Oracle Database server at IP `10.203.14.169:9534`
   - PHP Account Signature API server at IP `10.203.14.169`

---

## 2. Software Installation (Prerequisites)

Before running the application, install the following software packages on the target PC:


### Step 1: Install Node.js (for Frontend Web App)

* **What it is:** The runtime environment required for the React client user interface.

* **Download Link:** [Download Node.js LTS (Windows Installer)](https://nodejs.org/) (Select the **LTS** version).

* **Installation:** Double-click the downloaded `.msi` file, click **Next** keeping default settings, and complete setup.


### Step 2: Install .NET 6.0 SDK (x86 / 32-bit)

* **What it is:** The software kit required to build and run the backend Web API.

* **Download Link:** [Download .NET 6.0 SDK](https://dotnet.microsoft.com/download/dotnet/6.0)

* **CRITICAL REQUIREMENT:** Under **SDK 6.0.x**, you **MUST** download the **Windows x86** (32-bit) version, **NOT** x64.

  > [!IMPORTANT]
  > The scanner’s native driver library (`mtxmlmcr.dll`) is 32-bit only. Compiling or running the backend API in 64-bit mode will prevent the DLL from loading, causing `BadImageFormatException` crashes.

* **Installation:** Run the downloaded installer and complete setup.

* **Ensuring `dotnet` is Globally Recognized:**
  After installing, open a terminal and test: `dotnet --version`.
  If PowerShell reports `'dotnet' is not recognized`, run this command in PowerShell to set your PATH permanently:
  ```powershell
  [System.Environment]::SetEnvironmentVariable('Path', 'C:\Users\' + $env:USERNAME + '\AppData\Local\Microsoft\dotnet;C:\Program Files (x86)\dotnet;C:\Program Files\dotnet;' + [System.Environment]::GetEnvironmentVariable('Path', 'User'), 'User')
  ```
  Then close and restart VS Code / your IDE so all integrated terminals inherit the updated environment.


### Step 3: Install MagTek Excella STX Drivers

* **What it is:** Proprietary USB drivers for Windows to communicate with the MagTek scanner.

* **Download Link:** [MagTek Excella STX Software](https://www.magtek.com/support/excella-stx?tab=software) (Download the **Excella STX SDK for Windows**).

* **Installation:** Extract the downloaded archive, run `Setup.exe`, and follow prompts.

* **Hardware Connection:** Connect the MagTek scanner to power and plug the USB cable into the PC.

* **Core Isolation Workaround (Windows 11):**
  On Windows 11, the legacy MagTek driver may fail to load, displaying Error Code 39 ("Windows cannot load the device driver...").

  **To resolve:**
  1. Open Windows **Start Menu** and search for **Core Isolation**.
  2. Toggle **Memory Integrity** to **Off**.
  3. **Restart the PC**.
  4. Open **Device Manager** (`Win + X` > `Device Manager`) and confirm **Excella STX USB** is listed cleanly under Imaging Devices or Universal Serial Bus controllers without warning icons.


### Step 4: Install MSXML 4.0 SP3 (Critical Dependency)

* **What it is:** Microsoft XML Core Services 4.0. The MagTek API strictly requires this legacy library. If missing, the backend API returns error code `63` (`Error MSXML Not Found`).

* **Installation Instructions:**
  1. Download `msxml4-kb2758694-enu...exe`.
  2. Open **Command Prompt as Administrator** and extract:
     ```cmd
     msxml4-kb2758694-enu_24abccbcceaf5bea9c3e34ff1f64c2aa3d57e308.exe /extract:C:\msxml_extracted
     ```
  3. Open `C:\msxml_extracted`, double-click **`msxml.msi`**, and complete installation.
  4. Verify file existence at `C:\Windows\SysWOW64\msxml4.dll`.
  5. **Register DLL in Windows Registry:** Open **Command Prompt as Administrator** and run:
     ```cmd
     regsvr32 C:\Windows\SysWOW64\msxml4.dll
     ```


### Step 5: Install Tesseract OCR (For 100% Offline Vision Field Extractions)

* **What it is:** The offline optical character recognition engine that parses handwritten and typed amounts, dates, and payee names from cropped cheque images.

* **Installer Location:** The installer file **`tesseract-setup.exe`** (50MB) is already downloaded and saved at:
  ```
  C:\Users\USG\Downloads\tesseract-setup.exe
  ```

* **Installation (15 Seconds):**
  1. Open File Explorer and navigate to `C:\Users\USG\Downloads\`.
  2. Double-click **`tesseract-setup.exe`**.
  3. Click **Next** keeping all default settings (Installs to `C:\Program Files\Tesseract-OCR`).
  4. Complete setup.

* **Verification:**
  Open a terminal window and test:
  ```cmd
  tesseract --version
  ```
  Once installed, all vision extractions execute **100% offline** without needing internet access.


### Step 6: Verify MagTek API DLL Version

The backend loads `backend\ScannerApi\mtxmlmcr.dll` before falling back to system paths. If the project DLL is older than the installed driver DLL, the API may enumerate only five devices and fail to expose `STX.STX001`.

1. Check installed MagTek DLL version in PowerShell:
   ```powershell
   (Get-Item C:\Windows\SysWOW64\mtxmlmcr.dll).VersionInfo.FileVersion
   ```

2. Check project DLL version in PowerShell:
   ```powershell
   (Get-Item .\backend\ScannerApi\mtxmlmcr.dll).VersionInfo.FileVersion
   ```

3. If the project DLL is older, sync it:
   ```powershell
   Copy-Item .\backend\ScannerApi\mtxmlmcr.dll .\backend\ScannerApi\mtxmlmcr.dll.bak
   Copy-Item C:\Windows\SysWOW64\mtxmlmcr.dll .\backend\ScannerApi\mtxmlmcr.dll -Force
   ```


### Step 6: Install Topaz Signature Pad Drivers & SigWeb Software

* **What it is:** Topaz SigWeb software allows web applications to communicate directly with physical Topaz signature pads via local web sockets.

* **Download Link:** [Topaz SigWeb Software Download](https://www.topazsystems.com/sigweb.html)

* **Installation Instructions:**

  1. Connect your physical Topaz Signature Pad to an available USB port on the PC.

  2. Download and run **`SigWeb.exe`** (or `SigPlus Pro`) as **Administrator**.

  3. During installer setup, when prompted to select your model and connection interface:
     - **For standard USB Signature Pads** (model numbers ending in `-HSB` or `-HSB-R` e.g., `T-S460-HSB-R`, `T-L462-HSB-R`): Select **`HSB (HID USB)`**.
     - **For Virtual Serial USB Signature Pads** (model numbers ending in `-B-R`): Select **`B-R (Virtual Serial COM)`** and pick the COM port (e.g. `COM1` through `COM99`) assigned to the device under Windows Device Manager (*Ports (COM & LPT)*).

  4. Complete the installer wizard.

  5. **Verify Background Service:** Open Windows Task Manager or Services (`services.msc`) and verify that the **`SigWebTablet`** service status is **Running**.

  6. **Test Signature Pad:** Visit [Topaz SigWeb Demo Page](https://www.topazsystems.com/sigwebdemo.html) in Chrome/Edge, click **Sign**, and sign on the physical pad to verify live ink capture.


### Step 7: Install Python 3.10+ & Tesseract OCR (for Vision Engine)

* **Python 3.10+:** [Download Python 3.10+ for Windows](https://www.python.org/downloads/). During setup, ensure **"Add Python to PATH"** is checked.

* **Tesseract OCR Engine:**
  1. Download the Tesseract Windows installer from [UB-Mannheim Tesseract Wiki](https://github.com/UB-Mannheim/tesseract/wiki).
  2. Run the installer and install to default location (`C:\Program Files\Tesseract-OCR`).

* **How to Verify `tesseract.exe` is Accessible in PowerShell:**
  1. Open PowerShell or Command Prompt.
  2. Type the following command and press **Enter**:
     ```powershell
     tesseract --version
     ```
  3. **What Success Looks Like:** If it displays version details (e.g., `tesseract v5.3.x`), it is properly configured and accessible.
  4. **If it displays an error** (`"tesseract : The term 'tesseract' is not recognized..."`):
     - Add `C:\Program Files\Tesseract-OCR` to your Windows `PATH` environment variables, **OR**
     - Open `backend/python_service/app.py` and confirm line 18 contains:
       ```python
       pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
       ```

---

## 3. Configuration


### Database Connection String

The backend API is configured to connect to the Oracle Database. To modify database connection parameters:

1. Open `backend/ScannerApi/Controllers/ScannerController.cs`.

2. Locate line 29 / 228:
   ```csharp
   private readonly string connectionString = "Data Source=10.203.14.169:9534/USGL;User Id=XVSCAN;Password=pass1234;";
   ```

3. Update IP address, port, service name, username, or password, and save.

---

## 4. How to Run the System

To run the complete system, start the three application processes in separate terminal windows:


### Step 1: Start the Backend Web API (.NET 6.0 x86)

1. Open PowerShell or Command Prompt.

2. Navigate to the backend directory:
   ```cmd
   cd C:\Users\USG\Downloads\ChequeScannerApp\backend\ScannerApi
   ```

> [!NOTE]
> **If PowerShell says `'dotnet' is not recognized`:**
> Run this single line in your terminal to refresh `.NET` into memory immediately:
> ```powershell
> $env:Path = "C:\Users\" + $env:USERNAME + "\AppData\Local\Microsoft\dotnet;C:\Program Files (x86)\dotnet;C:\Program Files\dotnet;" + $env:Path
> ```

3. Restore NuGet dependencies:
   ```cmd
   dotnet restore
   ```

4. Build the application for 32-bit target (using `--self-contained false` to ensure framework binding):
   ```cmd
   dotnet build ScannerApi.csproj --configuration Release --runtime win-x86 --self-contained false
   ```

5. Run the backend Web API:
   ```cmd
   dotnet run
   ```
   *The Web API is successfully running once it displays `Now listening on: http://localhost:5042`.*


### Step 2: Start the Pure Python Vision Engine (OCR & Signature Crop)

1. Open a **new** PowerShell or Command Prompt window.

2. Navigate to the python service directory:
   ```cmd
   cd C:\Users\USG\Downloads\ChequeScannerApp\backend\python_service
   ```

3. Install required Python packages:
   ```cmd
   pip install -r requirements.txt
   ```

4. **Start the Vision Engine server:**

   * **Option A: Development Mode (Default)**
     ```cmd
     python app.py
     ```

   * **Option B: Production Mode (Waitress WSGI Server)**
     ```powershell
     python -c "from waitress import serve; from app import app; serve(app, host='0.0.0.0', port=8130)"
     ```

   *The Vision Engine is successfully running once it displays `Starting ChequeScanner Pure Python Vision Engine on port 8130...`.*


### Step 3: Start the Frontend Web Application (React)

1. Open a **new** PowerShell or Command Prompt window.

2. Navigate to the frontend directory:
   ```cmd
   cd C:\Users\USG\Downloads\ChequeScannerApp\frontend
   ```

3. Install package dependencies:
   ```cmd
   npm install
   ```

4. Start the Vite development server:
   ```cmd
   npm run dev
   ```
   *The client is successfully running once it displays `Local: http://localhost:8080/`.*

---

## 5. Step-by-Step Scanning, Signing & Saving Guide

Once all three servers (`port 5042`, `port 8130`, and `port 8080`) are running, follow this operational workflow:


### Step 1: Open the Application

1. Open Google Chrome, Microsoft Edge, or Firefox and navigate to:
   ```
   http://localhost:8080/
   ```

2. Check the left status panel:
   * **CONNECTED** (in green) and device name **`STX.STX001`**.
   * If disconnected, verify physical USB connection and click **Connect Device**.


### Step 2: Load and Scan the Cheque

1. Insert cheque into manual feed throat of the MagTek scanner (front facing scanner, magnetic MICR stripe at bottom).

2. Click **Scan Check** in the React Web App.

3. The scanner processes the document and populates:
   * **Front Image** and **Back Image** previews.
   * Extracted **MICR Code**, **Check Number**, **Routing Number**, **Account Number**, and **Bank Code** (processed via Vision Engine on port 8130).


### Step 3: Live Signature Capture (Topaz Signature Pad)

1. If live signature capture is required, ensure the customer is ready with the Topaz Signature Pad.

2. The Topaz pad will capture live pen strokes directly via `SigWeb`.

3. The signature image auto-binds to the verification dashboard.


### Step 4: Validate Account Signature Templates

1. Click **Validate Signature** below the cheque image.

2. The app fetches approved signature cards from the PHP Signature API (`10.203.14.169`) and compares them side-by-side with the scanned/captured signature.


### Step 5: Save Transaction to Database

1. Enter the transaction reference in **Voucher No** (e.g. `1234999`).

2. Enter transaction narrative in **Narration**.

3. Click **Save to DB**.

4. Confirmation notification: `Voucher successfully saved to database`. Images and data are stored in Oracle DB.

---

## 6. Troubleshooting Common Errors

| Error Code / Message | Primary Reason | Solution |
| :--- | :--- | :--- |
| **Failed to open device (Code 63) or MTMICRGetDevice returns 6** | MSXML 4.0 missing or unregistered. | Run `regsvr32 C:\Windows\SysWOW64\msxml4.dll` as Administrator, then restart backend. |
| **`/devices` shows 5 devices, missing `STX.STX001`** | Outdated local `mtxmlmcr.dll`. | Replace `backend\ScannerApi\mtxmlmcr.dll` with `C:\Windows\SysWOW64\mtxmlmcr.dll` and restart backend. |
| **Topaz Signature Pad Not Responding / SigWeb Error** | `SigWebTablet` background service is stopped or USB disconnected. | Open `services.msc`, start **SigWebTablet** service. Test on `https://www.topazsystems.com/sigwebdemo.html`. |
| **Python Vision Engine (Port 8130) Connection Refused** | Python service (`app.py`) is not running. | Open terminal, navigate to `backend/python_service`, and run `python app.py`. |
| **`dotnet : The term 'dotnet' is not recognized`** | `.NET` path missing from current terminal session. | In your open PowerShell window, run `$env:Path = "C:\Users\USG\AppData\Local\Microsoft\dotnet;" + $env:Path`. |
| **Device Manager Code 39** | Windows Core Isolation blocking legacy driver. | Turn **Memory Integrity** to **Off** in Windows Security Settings and restart PC. |
| **BadImageFormatException / DLL Fail** | Backend compiled in 64-bit mode instead of 32-bit x86. | Install **x86 .NET 6.0 SDK** and build with `--runtime win-x86 --self-contained false`. |
| **Database Connection Error** | Oracle DB IP `10.203.14.169` unreachable. | Verify network connection. Check connection string in `ScannerController.cs`. |

---

> [!TIP]
> **VS Code Phantom Error Clear:** If VS Code displays cached or phantom syntax errors, press `Ctrl + Shift + P`, search for `Developer: Reload Window`, and press Enter.

> **Reload Window**
> To clear VS Code's cached in-memory language server state:
> Press Ctrl + Shift + P in VS Code.
> Type Developer: Reload Window and press Enter.

Remember backend: VSCANNER_API