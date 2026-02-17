# Cheque Scanner App - Installation Guide

This guide will walk you through installing all necessary software, drivers, and dependencies to run the Cheque Scanner Application (both frontend and backend).

---

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Hardware Requirements](#hardware-requirements)
3. [Software Installation](#software-installation)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Configuration](#configuration)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Operating System
- **Windows 10** or **Windows 11** (64-bit)
- **CRITICAL:** The backend API must be compiled and run in **x86 (32-bit) mode** to support the MagTek MICR DLL (`mtxmlmcr.dll`)

### Network Access
- Access to Oracle Database server at `10.203.14.169:9534`
- Internet connection for downloading dependencies

---

## Hardware Requirements

### MagTek Excella STX Scanner
The application requires a **MagTek Excella STX** check scanner device with:
- USB 2.0 or Ethernet connectivity
- MICR reading capability
- Dual-sided image scanning
- Endorsement printer (optional)

---

## Software Installation

### 1. Node.js (for Frontend)

The frontend is built with React 18 and requires Node.js.

#### Download and Install
1. Visit the official Node.js website: [https://nodejs.org/](https://nodejs.org/)
2. Download the **LTS (Long Term Support)** version for Windows
3. Run the installer (`.msi` file)
4. Follow the installation wizard:
   - Accept the license agreement
   - Keep the default installation path (e.g., `C:\Program Files\nodejs\`)
   - Ensure "Add to PATH" is checked
   - Click **Install**

#### Verify Installation
Open **PowerShell** or **Command Prompt** and run:
```powershell
node -v
npm -v
```

You should see version numbers (e.g., `v20.x.x` for Node and `10.x.x` for npm).

---

### 2. .NET 6.0 SDK (for Backend)

The backend API is built with ASP.NET Core 6.0 and **must run in x86 mode**.

#### Download and Install

> [!IMPORTANT]
> You need to install the **x86 (32-bit)** version of the .NET 6.0 SDK to ensure compatibility with the MagTek MICR library (`mtxmlmcr.dll`).

1. Visit the official .NET download page: [https://dotnet.microsoft.com/download/dotnet/6.0](https://dotnet.microsoft.com/download/dotnet/6.0)
2. Under **SDK 6.0.x**, select **Windows x86** (not x64)
3. Run the installer
4. Follow the installation wizard

#### Verify Installation
Open **PowerShell** or **Command Prompt** and run:
```powershell
dotnet --version
dotnet --info
```

You should see version `6.0.x` listed. The `--info` command will display installed SDKs and runtimes.

---

### 3. MagTek Excella STX Drivers

The MagTek scanner requires proprietary drivers and the MICR SDK.

#### Download and Install

> [!CAUTION]
> Always download drivers from official MagTek sources to ensure compatibility and security.

1. Visit the **MagTek Support** website: [https://www.magtek.com/support/](https://www.magtek.com/support/)

(https://www.magtek.com/support/excella-stx?tab=software)
2. Navigate to **Downloads** > **Check Readers** > **Excella STX**
3. Download the **Excella STX SDK** for Windows
   - The SDK includes:
     - Drivers for USB and Ethernet connectivity
     - `mtxmlmcr.dll` (MICR API library)
     - Documentation and sample code
4. Extract the downloaded ZIP file
5. Run the driver installer (`Setup.exe` or similar)
6. Follow the installation wizard
7. **Connect your MagTek Excella STX device** via USB or Ethernet
8. Windows should detect the device and install the drivers automatically

#### Alternative Sources
If you cannot access the MagTek website, the SDK may be available from:
- [MagTek Developer Portal](https://www.magtek.com/developers/)
- Contact MagTek support directly: [https://www.magtek.com/contact/](https://www.magtek.com/contact/)

#### Verify Installation
1. Connect the MagTek Excella STX scanner to your computer
2. Open **Device Manager** (Press `Win + X`, select **Device Manager**)
3. Look for the device under **Imaging Devices** or **USB Controllers**
4. Ensure there are no yellow warning icons next to the device

---

## Backend Setup

The backend is an ASP.NET Core 6.0 Web API located in `./backend/ScannerApi`.

### Step 1: Navigate to Backend Directory
Open **PowerShell** or **Command Prompt** and navigate to the backend directory:
```powershell
cd C:\Users\PTADMIN\Downloads\ChequeScannerApp\backend\ScannerApi
```

### Step 2: Restore NuGet Packages
Restore all required NuGet packages:
```powershell
dotnet restore
```

This will download:
- `Oracle.ManagedDataAccess.Core` (Oracle database client)
- `Microsoft.AspNetCore.Mvc.NewtonsoftJson` (JSON serialization)
- `Swashbuckle.AspNetCore` (API documentation)
- Other dependencies

### Step 3: Build the Project
Build the project in **x86 mode**:
```powershell
dotnet build --configuration Release --runtime win-x86
```

> [!NOTE]
> The project is already configured to target `x86` in `ScannerApi.csproj` via `<PlatformTarget>x86</PlatformTarget>`.

### Step 4: Run the Backend API
Start the API server:
```powershell
dotnet run
```

The API will start on **`http://localhost:5042`**.

#### Verify Backend is Running
1. Open a web browser and navigate to:
   ```
   http://localhost:5042/api/scanner/devices
   ```
2. You should see a JSON response listing available scanner devices (or an empty array if no device is connected)

Alternatively, access the Swagger UI documentation:
```
http://localhost:5042/swagger
```

---

## Frontend Setup

The frontend is a React 18 application built with Vite and TypeScript, located in `./frontend`.

### Step 1: Navigate to Frontend Directory
Open a **new** PowerShell or Command Prompt window and navigate to the frontend directory:
```powershell
cd C:\Users\PTADMIN\Downloads\ChequeScannerApp\frontend
```

### Step 2: Install Dependencies
Install all npm packages:
```powershell
npm install
```

This will install:
- React 18 and React DOM
- TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Shadcn UI components (@radix-ui)
- React Query, Axios (data fetching)
- React Hook Form, Zod (form handling and validation)
- And other dependencies

### Step 3: Run the Frontend Development Server
Start the Vite development server:
```powershell
npm run dev
```

The frontend will typically start on **`http://localhost:8080`** or **`http://localhost:5173`** (Vite's default).

#### Verify Frontend is Running
1. Open a web browser and navigate to the URL displayed in the terminal (e.g., `http://localhost:5173`)
2. You should see the Cheque Scanner App interface

---

## Configuration

### Database Connection

The backend connects to an Oracle database. The connection string is **hardcoded** in `backend/ScannerApi/Controllers/ScannerController.cs` (line 29):

```csharp
private readonly string connectionString = "Data Source=10.203.14.169:9534/USGL;User Id=XVSCAN;Password=pass1234;";
```

**Target Table:** `mbank_cheques`

**Columns:**
- `TRANS_ID` - Voucher/Transaction ID
- `IMAGE1` - Front image (BLOB)
- `IMAGE2` - Back image (BLOB)
- `NARRATION` - MICR data and narration text

> [!WARNING]
> The database credentials are hardcoded. For production deployments, use environment variables or secure configuration management.

### External Services

The application also references external services:

1. **OCR Service:** `http://localhost:7007` (for cheque OCR processing)
2. **Account Signature API:** `http://10.203.14.169` (PHP-based API for fetching account signatures)

Ensure these services are running if you need their functionality.

---

## Verification

### Complete System Test

1. **Start Backend:**
   ```powershell
   cd C:\Users\PTADMIN\Downloads\ChequeScannerApp\backend\ScannerApi
   dotnet run
   ```

2. **Start Frontend (in a new terminal):**
   ```powershell
   cd C:\Users\PTADMIN\Downloads\ChequeScannerApp\frontend
   npm run dev
   ```

3. **Connect Scanner:**
   - Ensure the MagTek Excella STX is connected via USB or Ethernet
   - Open the frontend in your browser
   - Click **Connect Device** (the UI should detect the scanner)

4. **Test Scanning:**
   - Set the document type (Check or MSR)
   - Load a check into the scanner
   - Click **Scan**
   - Review the scanned images and MICR data
   - Click **Save to DB** to store in Oracle database

### Backend Logs

The backend creates log files in the API directory:
- `ExcellaLog.txt` - MagTek SDK logs
- `debug.log` - Application debug logs

Check these files if you encounter issues.

---

## Troubleshooting

### Common Issues

#### 1. **"Failed to load mtxmlmcr.dll" or DLL Not Found**

**Cause:** The MagTek MICR DLL is either missing or the backend is not running in x86 mode.

**Solution:**
- Ensure the MagTek SDK is installed
- Verify `mtxmlmcr.dll` exists in `backend/ScannerApi/` directory
- Confirm the backend is built for x86:
  ```powershell
  dotnet build --configuration Release --runtime win-x86
  ```

#### 2. **"No device found"**

**Cause:** The MagTek scanner is not connected or drivers are not installed.

**Solution:**
- Check Device Manager for the scanner
- Reinstall MagTek drivers
- Try disconnecting and reconnecting the device
- Restart the backend API

#### 3. **Database Connection Errors**

**Cause:** Cannot connect to Oracle database at `10.203.14.169`.

**Solution:**
- Verify network connectivity to `10.203.14.169:9534`
- Test with `ping 10.203.14.169`
- Ensure firewall allows connection to port 9534
- Verify database credentials in `ScannerController.cs`

#### 4. **Frontend Cannot Reach Backend**

**Cause:** Backend API is not running or CORS is blocking requests.

**Solution:**
- Ensure backend is running on `http://localhost:5042`
- Check CORS configuration in `backend/ScannerApi/Startup.cs`
- Verify frontend API base URL in `frontend/src/services/api.ts`

#### 5. **npm install Fails**

**Cause:** Network issues or outdated npm version.

**Solution:**
- Update npm: `npm install -g npm@latest`
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then retry `npm install`

#### 6. **Port Already in Use**

**Cause:** Port 5042 (backend) or 5173/8080 (frontend) is already in use.

**Solution:**
- Stop other applications using the port
- Or modify the port in backend's `Program.cs` / frontend's `vite.config.ts`

---

## Additional Resources

### Documentation
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [ASP.NET Core Documentation](https://docs.microsoft.com/aspnet/core/)
- [MagTek Developer Portal](https://www.magtek.com/developers/)

### Support
- **Project Documentation:** See `PROJECT_DOCUMENTATION.md` in the root directory for architecture details
- **MagTek Support:** [https://www.magtek.com/support/](https://www.magtek.com/support/)

---

## Quick Start Summary

```powershell
# Terminal 1 - Backend
cd C:\Users\PTADMIN\Downloads\ChequeScannerApp\backend\ScannerApi
dotnet restore
dotnet run

# Terminal 2 - Frontend
cd C:\Users\PTADMIN\Downloads\ChequeScannerApp\frontend
npm install
npm run dev
```

Access the application at `http://localhost:5173` (or the URL shown in Terminal 2).

---

**You're all set!** 🎉 The Cheque Scanner App should now be fully operational.
