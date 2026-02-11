# Cheque Scanner App - Project Documentation

## 1. Project Overview
This project is a voucher scanning application designed to work with the **MagTek Excella STX** device. It consists of a modern **React frontend** for the user interface and a **.NET Core backend** that handles hardware communication and database operations.

## 2. Architecture
The application follows a client-server architecture:
- **Frontend (Client):** A Single Page Application (SPA) built with React and TypeScript. It runs in the browser and communicates with the backend via REST API.
- **Backend (Server):** An ASP.NET Core Web API running on `http://localhost:5042`. It acts as a middleware between the frontend, the physical scanner device, and the Oracle database.
- **Hardware Integration:** The backend uses unmanaged code (`mtxmlmcr.dll`) to interface with the MagTek scanner drivers.
- **Database:** Stores scanned voucher data (images, MICR data, narration) in an Oracle database.

### External Services
The application also interacts with:
- **OCR Service:** `http://localhost:7007` (referenced in frontend for cheque OCR).
- **Account Signature API:** `http://10.203.14.169` (PHP-based API for fetching account signatures).

---

## 3. Frontend

### location
`./frontend`

### Technology Stack
- **Framework:** React 18
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn UI (@radix-ui)
- **State/Data Fetching:** React Query, Axios
- **Form Handling:** React Hook Form, Zod

### Key Files & Directories
- `src/main.tsx`: Application entry point.
- `src/App.tsx`: Main application component containing the core logic for scanning flow.
- `src/services/api.ts`: API service layer handling all HTTP requests to the backend and external services.
- `src/components/`: Reusable UI components.
- `vite.config.ts`: Vite configuration.

### Setup & Development
1.  Navigate to the frontend directory: `cd frontend`
2.  Install dependencies: `npm install`
3.  Run the development server: `npm run dev` (Access at `http://localhost:8080` or similar).

### Build
To create a production build:
```bash
npm run build
```
This generates static files in the `dist` directory.

---

## 4. Backend

### Location
`./backend/ScannerApi`

### Technology Stack
- **Framework:** ASP.NET Core 6.0 Web API
- **Language:** C#
- **Platform:** Windows x86 (Required for `mtxmlmcr.dll` compatibility)
- **Database Client:** Oracle.ManagedDataAccess.Core

### Key Files
- `Program.cs`: Entry point, configures the web host and port (5042).
- `Startup.cs`: Configures services, CORS policies, and request pipeline.
- `Controllers/ScannerController.cs`: The core controller handling all business logic, device control, and database interactions.
- `mtxmlmcr.dll`: MagTek MICR API library (Native DLL).

### Database Configuration
The application connects to an Oracle database using the following connection string (found in `ScannerController.cs`):
`Data Source=10.203.14.169:9534/USGL;User Id=XVSCAN;Password=pass1234;`

**Target Table using:** `mbank_cheques`
Columns:
- `TRANS_ID` (Voucher No)
- `IMAGE1` (Front Image Blob)
- `IMAGE2` (Back Image Blob)
- `NARRATION`

### API Endpoints (`/api/scanner`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/devices` | Lists available scanner devices. |
| `GET` | `/status` | Checks the connection status of the current device. |
| `POST` | `/connect` | Connects to the first available device. |
| `POST` | `/connect/{deviceName}` | Connects to a specific device. |
| `POST` | `/set-doctype/{docType}` | Sets mode to `CHECK` or `MSR` (Magnetic Stripe Reader). |
| `POST` | `/scan` | Initiates a scan operation. |
| `POST` | `/save` | Saves the scanned data and images to the database. |
| `GET` | `/view/{transId}` | Retrieves a saved voucher by its Transaction ID. |

### Setup & Run
1.  Prerequisites: .NET 6.0 SDK, MagTek Drivers installed.
2.  Navigate to the directory: `cd backend/ScannerApi`
3.  Run the application: `dotnet run`
    *   **Note:** The application attempts to bind to `http://localhost:5042`.
    *   It also creates a `ScanImages` directory and `ExcellaLog.txt` for logging.

---

## 5. Development Workflow

1.  **Start the Backend:** Run the .NET API. It must be running for functionality like device connection and scanning to work, even in dev mode.
2.  **Start the Frontend:** Run `npm run dev` to launch the UI.
3.  **Operation:**
    *   The UI polls the backend for device status.
    *   User connects to a device.
    *   User loads a document (Check or Card) and clicks "Scan".
    *   Backend commands the hardware to scan and returns base64 images/data.
    *   User reviews data and clicks "Save to DB".


## 6. Known Dependencies/Requirements
- **MagTek Drivers:** The host machine must have the appropriate drivers for the MagTek Excella STX.
- **x86 Architecture:** The backend is set to target `x86` specifically to load the 32-bit `mtxmlmcr.dll`.
- **Oracle Connectivity:** The host machine must have network access to `10.203.14.169`.
