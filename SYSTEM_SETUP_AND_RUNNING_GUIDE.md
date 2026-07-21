# Cheque Scanner App - System Setup & Running Guide

This guide is designed for both technical and non-technical users to set up, configure, and run the Cheque Scanner Application from scratch. It covers all physical hardware connections, software prerequisites, system configurations, executing the servers, and performing a test scan.

---

## 1. System Requirements

### Hardware Requirements
1. **MagTek Excella STX Scanner** (specifically model Excella STX USB/Ethernet).
2. **USB 2.0 A-to-B Cable** (connecting scanner to PC) and the scanner's **Power Adapter**.
3. **Sample Cheque** loaded into the scanner manual feed throat.

### PC & Network Requirements
1. **Operating System:** Windows 10 or Windows 11 (64-bit).
2. **Network Connection:** Active network access to the Oracle Database server at IP `10.203.14.169:9534`.

---

## 2. Software Installation (Prerequisites)

Before running the code, install the following software packages on the target PC:

### Step 1: Install Node.js (for Frontend Web App)
* **What it is:** The environment required to run the client-side user interface.
* **Download Link:** [Download Node.js LTS (Windows Installer)](https://nodejs.org/) (Select the **LTS** version).
* **Installation:** Double-click the downloaded `.msi` file, click **Next** through the installation wizard, keeping all defaults, and finish.

### Step 2: Install .NET 6.0 SDK (x86/32-bit)
* **What it is:** The software kit required to build and run the backend Web API.
* **Download Link:** [Download .NET 6.0 SDK](https://dotnet.microsoft.com/download/dotnet/6.0)
* **CRITICAL REQUIREMENT:** Under the **SDK 6.0.x** section, you **MUST** download the **Windows x86** (32-bit) version, **NOT** the x64 version. 
  > [!IMPORTANT]
  > The scanner’s native driver library (`mtxmlmcr.dll`) is 32-bit only. Compiling or running the project in 64-bit mode will prevent the DLL from loading, causing crashes.
* **Installation:** Run the downloaded installer and follow the instructions to complete setup.

### Step 3: Install MagTek Excella STX Drivers
* **What it is:** The proprietary USB drivers allowing Windows to recognize the physical scanner.
* **Download Link:** [MagTek Excella STX Software](https://www.magtek.com/support/excella-stx?tab=software) (Download the **Excella STX SDK for Windows**).
* **Installation:** Extract the downloaded folder, run `Setup.exe` (or driver installer), and follow the prompts.
* **Hardware Connection:** Plug the MagTek scanner into power and connect the USB cable to the PC.
* **Core Isolation Security Workaround (For Windows 11):**
  On Windows 11, the legacy MagTek driver may fail to load, showing a yellow triangle in Device Manager with **Error Code 39** ("Windows cannot load the device driver..."). This is blocked by Windows Core Isolation.
  **To disable it:**
  1. Open the Windows **Start Menu**, search for **Core Isolation**, and open it.
  2. Toggle **Memory Integrity** to **Off**.
  3. **Restart the PC** for changes to take effect.
  4. Open **Device Manager** (`Win + X` > `Device Manager`), verify the device under **Imaging Devices** or **Universal Serial Bus controllers** is listed as **Excella STX USB** with no warning icon.

### Step 4: Install MSXML 4.0 SP3 (Critical Dependency)
* **What it is:** Microsoft XML Core Services 4.0. The MagTek API strictly requires this legacy library to communicate with the hardware. If missing, the backend API will fail to connect, returning error code `63` (`Error MSXML Not Found`).
* **Direct Download Link:** [Microsoft Update Catalog MSXML 4.0 SP3 (KB2758694)](https://catalog.s.download.windowsupdate.com/msdownload/update/software/secu/2012/12/msxml4-kb2758694-enu_24abccbcceaf5bea9c3e34ff1f64c2aa3d57e308.exe)
* **Installation Instructions:**
  1. Click the link above to download the `msxml4-kb2758694-enu...exe` file.
  2. Open **Command Prompt** or **PowerShell** as **Administrator**.
  3. Run the following extraction command:
     ```cmd
     msxml4-kb2758694-enu_24abccbcceaf5bea9c3e34ff1f64c2aa3d57e308.exe /extract:C:\msxml_extracted
     ```
  4. Navigate to `C:\msxml_extracted` in File Explorer, double-click **`msxml.msi`**, and click through the setup wizard to complete the installation.
  5. Verify `msxml4.dll` exists in `C:\Windows\SysWOW64\msxml4.dll`.
  6. **Register the DLL manually:** Open **Command Prompt as Administrator** and run:
     ```cmd
     regsvr32 C:\Windows\SysWOW64\msxml4.dll
     ```
  7. **Restart your backend server** process to ensure it loads the newly registered COM components.

### Step 5: Verify the MagTek API DLL Version
The backend loads `backend\ScannerApi\mtxmlmcr.dll` before it falls back to the Windows-installed MagTek DLL. If this project-local DLL is older than the installed driver DLL, the API may enumerate only five devices and fail to expose `STX.STX001`.

1. Confirm the installed MagTek x86 DLL exists:
   ```powershell
   (Get-Item C:\Windows\SysWOW64\mtxmlmcr.dll).VersionInfo.FileVersion
   ```
2. Confirm the project DLL version:
   ```powershell
   (Get-Item .\backend\ScannerApi\mtxmlmcr.dll).VersionInfo.FileVersion
   ```
3. If the project DLL is older, back it up and replace it with the installed MagTek x86 DLL:
   ```powershell
   Copy-Item .\backend\ScannerApi\mtxmlmcr.dll .\backend\ScannerApi\mtxmlmcr.dll.bak
   Copy-Item C:\Windows\SysWOW64\mtxmlmcr.dll .\backend\ScannerApi\mtxmlmcr.dll -Force
   ```
4. Restart the backend and verify `/api/scanner/devices` returns six devices, including `STX.STX001`.

---

## 3. Configuration

### Database Connection String
The backend API is pre-configured to connect to the Oracle Database. If the database connection details change:
1. Open the backend source code file: `backend/ScannerApi/Controllers/ScannerController.cs`
2. Locate the connection string declaration (around line 29 / 228):
   ```csharp
   private readonly string connectionString = "Data Source=10.203.14.169:9534/USGL;User Id=XVSCAN;Password=pass1234;";
   ```
3. Update the IP address, port number, service name (`USGL`), username, or password, and save.

---

## 4. How to Run the System

Follow these steps to run the backend API and frontend servers side by side:

### Step 1: Start the Backend Web API
1. Open **Command Prompt** or **PowerShell**.
2. Navigate to the backend directory:
   ```cmd
   cd C:\Users\USG\Downloads\ChequeScannerApp\backend\ScannerApi
   ```
3. Restore NuGet dependencies:
   ```cmd
   dotnet restore
   ```
4. Build the application for 32-bit (x86) target:
dotnet build ScannerApi.csproj --configuration Release --runtime win-x86 --self-contained false



   ```cmd
   dotnet build --configuration Release --runtime win-x86
   ```
5. Run the backend API:
   ```cmd
   dotnet run
   ```
   *The server is successfully running once it displays `Now listening on: http://localhost:5042`.*

### Step 2: Start the Frontend Web Application
1. Open a **new** Command Prompt or PowerShell window.
2. Navigate to the frontend directory:
   ```cmd
   cd C:\Users\USG\Downloads\ChequeScannerApp\frontend
   ```
3. Install required React package dependencies:
   ```cmd
   npm install
   ```
4. Start the development web server:
   ```cmd
   npm run dev
   ```
   *The client is successfully running once it displays `Local: http://localhost:8080/`.*

---

## 5. Step-by-Step Scanning & Saving Guide

Once both servers are running, follow this end-to-end operation workflow:

### Step 1: Open the Application
1. Open a web browser (Chrome, Edge, Firefox) and navigate to:
   ```
   http://localhost:8080/
   ```
2. The user interface will load. In the left panel, you should see:
   * **CONNECTED** (status in green) and the device name **`STX.STX001`**.
   * If it is not connected, ensure the scanner USB is plugged in and click **Connect Device**.

### Step 2: Load the Cheque
1. Slide the cheque into the manual feed throat on the physical MagTek scanner:
   * **Orientation:** The front of the cheque faces toward the scanner, and the bottom edge (magnetic stripe containing the numbers) slides along the bottom groove.
   * **Stripe Position:** The magnetic stripe must face the back/right side.
2. Push the cheque in until the scanner's internal rollers grip the document. The scanner LED will turn green or flash, indicating the cheque is ready.

### Step 3: Scan the Cheque
1. In the React Web App interface, click **Scan Check**.
2. The physical scanner will pull the cheque through, scan both sides, and return the data.
3. The dashboard will instantly populate:
   * **Front Image** and **Back Image** previews.
   * Extracted **MICR Code**, **Check Number**, **Routing Number**, **Account Number**, and **Bank Code**.

### Step 4: Validate Signature (Optional)
1. Click the **Validate Signature** button below the front image preview.
2. The app will fetch the approved signature templates for that account from the PHP Signature API, allowing you to visually verify the signatures side-by-side.

### Step 5: Save to Database
1. Enter the transaction reference in the **Voucher No** input field (e.g. `1234999`).
2. Enter any description/narrative in the **Narration** input field.
3. Click the **Save to DB** button on the left panel.
4. You will see a success message: `Voucher successfully saved to database`. The base64 cheque images, MICR details, and narration are now stored securely in the Oracle Database!

---

## 6. Troubleshooting Common Errors

| Error Code / Message | Primary Reason | Solution |
| :--- | :--- | :--- |
| **Failed to open device (Code 63) or MTMICRGetDevice returns 6** | MSXML 4.0 is missing or not registered in the Windows Registry on this PC. | Follow **Step 4** of the Software Installation section. Make sure to run `regsvr32 C:\Windows\SysWOW64\msxml4.dll` as Administrator, and restart the backend server. |
| **`/devices` shows only 5 devices and misses `STX.STX001`** | The backend may be loading an older project-local `mtxmlmcr.dll` instead of the installed MagTek x86 DLL. | Follow **Step 5** of the Software Installation section. Back up `backend\ScannerApi\mtxmlmcr.dll`, replace it with `C:\Windows\SysWOW64\mtxmlmcr.dll`, restart the backend, then confirm `/api/scanner/devices` shows 6 devices. |
| **Device not found (Code -7)** | The scanner is unplugged, powered off, or drivers are missing. | Check USB/Power connection. Reinstall MagTek USB drivers. |
| **Device Manager Code 39** | Windows Core Isolation is blocking the legacy driver. | Turn **Memory Integrity** to **Off** in Windows Security Settings and restart the PC (see **Step 3**). |
| **Failed to load DLL or BadImageFormatException** | The backend API is running in 64-bit (x64) mode, but the driver is 32-bit (x86). | Install the **x86 (32-bit)** version of the .NET 6.0 SDK. Rebuild using target `--runtime win-x86`. |
| **Database Connection Failures** | Oracle Database IP is unreachable or credentials have expired. | Test ping to `10.203.14.169`. Update connection string inside `ScannerController.cs` with valid credentials. |
| **Port 5042 or 8080 already in use** | Another instance of the backend API or frontend is already running. | Close any other running terminal windows. In Task Manager, terminate any hung `dotnet` or `node` processes. |