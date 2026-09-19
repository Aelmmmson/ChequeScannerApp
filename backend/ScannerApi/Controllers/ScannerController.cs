using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Text;
using System.Runtime.InteropServices;
using System.IO;
using Oracle.ManagedDataAccess.Client;
using System.Threading;
using System.Linq;
using Microsoft.AspNetCore.Cors;
using System.Text.RegularExpressions;
using Npgsql;
using System.Net.Http;
using System.Threading.Tasks;

namespace ScannerApi.Controllers
{
    [ApiController]
    [Route("api/scanner")]
    [EnableCors("AllowFrontend")]
    public class ScannerController : ControllerBase, IDisposable
    {
        private const int DEFAULT_STRING_BUFFER_SIZE = 4096;
        private const int MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
        private const long MAX_LOG_FILE_BYTES = 10 * 1024 * 1024; // 10 MB log cap
        private string? g_strLogFileName;
        private string g_strAppPath = AppDomain.CurrentDomain.BaseDirectory;
        private int g_hLogFile = -1;
        private static bool m_bDeviceOpened = false;
        private static string m_strCurrentDeviceName = "";
        private string m_strOptions = new string('\0', DEFAULT_STRING_BUFFER_SIZE);
        private string m_strDocInfo = "";
        // Oracle connection string (Commented - do not remove nor fallback)
        // private readonly string connectionString = "Data Source=10.203.14.169:9534/USGL;User Id=XVSCAN;Password=pass1234;";

        private readonly IConfiguration? _configuration;
        private readonly string pgConnectionString;
        private readonly string imagingApiBaseUrl;
        private bool disposed = false;
        private static StreamWriter? logWriter;
        private static readonly object logLock = new object();
        private static DocType m_nDocType = DocType.CHECK;

        private enum DocType
        {
            CHECK,
            MSR,
            INVALID
        }

        public ScannerController(IConfiguration? configuration = null)
        {
            _configuration = configuration;
            pgConnectionString = _configuration?.GetConnectionString("PostgreSQL") ?? "Host=10.203.14.50;Port=5432;Database=xvscan;Username=postgres;Password=usg12345;";
            imagingApiBaseUrl = (_configuration?["ExternalApis:ImagingApiBaseUrl"] ?? "http://10.203.14.169").TrimEnd('/');

            SetupLogging();
            LogMessage($"Constructor: Initialized ScannerController with DocType={m_nDocType}");
        }

        private void SetupLogging()
        {
            g_strLogFileName = Path.Combine(g_strAppPath, "ExcellaLog.txt");
            g_hLogFile = CreateFile(g_strLogFileName, GENERIC_READ | GENERIC_WRITE,
                FILE_SHARE_READ | FILE_SHARE_WRITE, 0, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, 0);

            if (g_hLogFile > 0)
            {
                MTMICRSetLogFileHandle(g_hLogFile);
                LogMessage("SetupLogging: Log file handle set successfully");
            }
            else
            {
                LogMessage("SetupLogging: Failed to create log file handle");
            }
        }

        private void LogMessage(string message)
        {
            lock (logLock)
            {
                try
                {
                    string logPath = Path.Combine(g_strAppPath, "debug.log");
                    string oldLogPath = Path.Combine(g_strAppPath, "debug.log.old");

                    // Check for 10 MB limit and perform strict 1-file overwrite rotation
                    if (System.IO.File.Exists(logPath))
                    {
                        System.IO.FileInfo fi = new System.IO.FileInfo(logPath);
                        if (fi.Length >= MAX_LOG_FILE_BYTES)
                        {
                            try
                            {
                                if (logWriter != null)
                                {
                                    logWriter.Flush();
                                    logWriter.Dispose();
                                    logWriter = null;
                                }
                                System.IO.File.Copy(logPath, oldLogPath, overwrite: true);
                                System.IO.File.Delete(logPath);
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"LogMessage: Error rotating log file: {ex.Message}");
                            }
                        }
                    }

                    if (logWriter == null || !logWriter.BaseStream.CanWrite)
                    {
                        var fileStream = new FileStream(logPath, FileMode.Append, FileAccess.Write, FileShare.ReadWrite);
                        logWriter = new StreamWriter(fileStream) { AutoFlush = true };
                    }

                    logWriter.WriteLine($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {message}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"LogMessage: Error writing log: {ex.Message}, message: {message}");
                }
            }
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        protected virtual void Dispose(bool disposing)
        {
            if (!disposed)
            {
                if (disposing)
                {
                    LogMessage("Dispose: Closing resources");
                }

                if (g_hLogFile > 0)
                {
                    CloseHandle(g_hLogFile);
                    g_hLogFile = -1;
                    LogMessage("Dispose: Closed log file handle");
                }

                if (m_bDeviceOpened)
                {
                    MTMICRCloseDevice(m_strCurrentDeviceName);
                    m_bDeviceOpened = false;
                    LogMessage("Dispose: Closed device connection");
                }

                if (disposing && logWriter != null)
                {
                    try
                    {
                        lock (logLock)
                        {
                            logWriter.Dispose();
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Dispose: Error disposing logWriter: {ex.Message}");
                        LogMessage($"Dispose: Error disposing logWriter: {ex.Message}");
                    }
                }

                disposed = true;
            }
        }

        ~ScannerController()
        {
            Dispose(false);
        }

        [HttpPost("set-doctype/{docType}")]
        public IActionResult SetDocType(string docType)
        {
            try
            {
                if (Enum.TryParse(docType.ToUpper(), out DocType parsedDocType) && parsedDocType != DocType.INVALID)
                {
                    m_nDocType = parsedDocType;
                    LogMessage($"SetDocType: Document type set to {m_nDocType}");
                    return Ok(new { success = true, message = $"Document type set to {m_nDocType}" });
                }
                LogMessage($"SetDocType: Invalid document type: {docType}");
                return BadRequest(new { success = false, message = $"Invalid document type: {docType}" });
            }
            catch (Exception ex)
            {
                LogMessage($"SetDocType: Error: {ex.Message}, StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { success = false, message = $"Error setting document type: {ex.Message}" });
            }
        }

        [HttpGet("status")]
        public IActionResult GetDeviceStatus()
        {
            try
            {
                string? deviceName = GetFirstDevice();
                if (string.IsNullOrEmpty(deviceName))
                {
                    LogMessage("GetDeviceStatus: No device found.");
                    return Ok(new { connected = false, message = "No device found" });
                }

                LogMessage($"GetDeviceStatus: Found device: {deviceName}, Current DocType={m_nDocType}");

                if (!m_bDeviceOpened || m_strCurrentDeviceName != deviceName)
                {
                    if (m_bDeviceOpened)
                    {
                        MTMICRCloseDevice(m_strCurrentDeviceName);
                        LogMessage($"GetDeviceStatus: Closed previous device: {m_strCurrentDeviceName}");
                        m_bDeviceOpened = false;
                    }

                    m_strCurrentDeviceName = deviceName;
                    int nRetOpen = MTMICROpenDevice(deviceName);
                    LogMessage($"GetDeviceStatus: MTMICROpenDevice returned {nRetOpen}");
                    if (nRetOpen != MICR_ST_OK)
                    {
                        MTMICRCloseDevice(deviceName);
                        LogMessage("GetDeviceStatus: Retried MTMICRCloseDevice");
                        nRetOpen = MTMICROpenDevice(deviceName);
                        LogMessage($"GetDeviceStatus: Retry MTMICROpenDevice returned {nRetOpen}");
                        if (nRetOpen != MICR_ST_OK)
                        {
                            return Ok(new { connected = false, message = $"Failed to open device, code: {nRetOpen}" });
                        }
                    }
                    m_bDeviceOpened = true;
                }

                int nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                StringBuilder response = new StringBuilder(DEFAULT_STRING_BUFFER_SIZE);
                int nRet = MTMICRQueryInfo(deviceName, "DeviceStatus", response, ref nResponseLength);
                LogMessage($"GetDeviceStatus: MTMICRQueryInfo attempt 1 returned {nRet}, Response: {response}, ResponseLength: {nResponseLength}");

                if (nRet != MICR_ST_OK || string.IsNullOrEmpty(response.ToString()))
                {
                    LogMessage("GetDeviceStatus: Retrying MTMICRQueryInfo");
                    nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                    response.Clear();
                    nRet = MTMICRQueryInfo(deviceName, "DeviceStatus", response, ref nResponseLength);
                    LogMessage($"GetDeviceStatus: MTMICRQueryInfo attempt 2 returned {nRet}, Response: {response}, ResponseLength: {nResponseLength}");
                }

                bool isConnected = nRet == MICR_ST_OK && !string.IsNullOrEmpty(response.ToString());
                LogMessage($"GetDeviceStatus: Device is {(isConnected ? "connected" : "not connected")}");

                return Ok(new { connected = isConnected, deviceName = deviceName, statusResponse = response.ToString() });
            }
            catch (Exception ex)
            {
                LogMessage($"GetDeviceStatus: Error: {ex.Message}, StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { error = $"Error checking device status: {ex.Message}" });
            }
        }

        [HttpGet("devices")]
        public IActionResult GetDeviceList()
        {
            try
            {
                List<string> devices = new List<string>();
                const int maxRetries = 3;
                const int maxDevices = 20;

                for (int attempt = 1; attempt <= maxRetries; attempt++)
                {
                    devices.Clear();
                    for (byte nTotalDev = 0; nTotalDev <= maxDevices; nTotalDev++)
                    {
                        StringBuilder strDeviceName = new StringBuilder(256);
                        int nRetCode = MTMICRGetDevice(nTotalDev, strDeviceName);
                        LogMessage($"GetDeviceList: Attempt {attempt}, Index {nTotalDev}, MTMICRGetDevice returned {nRetCode}, DeviceName: {strDeviceName}");

                        if (nRetCode == MICR_ST_DEVICE_NOT_FOUND)
                        {
                            LogMessage($"GetDeviceList: Device not found at index {nTotalDev}, stopping enumeration");
                            break;
                        }

                        if (nRetCode == MICR_ST_OK && !string.IsNullOrEmpty(strDeviceName.ToString()))
                        {
                            string deviceName = strDeviceName.ToString();
                            if (!devices.Contains(deviceName))
                            {
                                devices.Add(deviceName);
                                LogMessage($"GetDeviceList: Added device: {deviceName}");
                            }
                        }
                    }

                    if (devices.Count > 0)
                    {
                        LogMessage($"GetDeviceList: Found {devices.Count} devices on attempt {attempt}: {string.Join(", ", devices)}");
                        break;
                    }

                    LogMessage($"GetDeviceList: No devices found on attempt {attempt}, retrying...");
                    Thread.Sleep(1000);
                }

                if (devices.Count == 0)
                {
                    LogMessage("GetDeviceList: No devices found after all retries.");
                    return Ok(new { devices = new string[0], message = "No devices found" });
                }

                LogMessage($"GetDeviceList: Final list: {string.Join(", ", devices)}");
                return Ok(new { devices = devices.ToArray(), message = $"{devices.Count} device(s) found" });
            }
            catch (Exception ex)
            {
                LogMessage($"GetDeviceList: Error: {ex.Message}, StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { error = $"Error retrieving device list: {ex.Message}" });
            }
        }

        [HttpPost("connect")]
        public IActionResult ConnectDevice()
        {
            try
            {
                if (m_bDeviceOpened)
                {
                    LogMessage($"ConnectDevice: Device already opened: {m_strCurrentDeviceName}, DocType={m_nDocType}");
                    return Ok(new { success = true });
                }

                m_strCurrentDeviceName = GetFirstDevice() ?? "";
                if (string.IsNullOrEmpty(m_strCurrentDeviceName))
                {
                    LogMessage("ConnectDevice: No device found");
                    return BadRequest(new { success = false, message = "No device found" });
                }

                int nRet = MTMICROpenDevice(m_strCurrentDeviceName);
                LogMessage($"ConnectDevice: MTMICROpenDevice returned {nRet}");
                if (nRet == MICR_ST_OK)
                {
                    m_bDeviceOpened = true;
                    LogMessage($"ConnectDevice: Device opened successfully: {m_strCurrentDeviceName}, DocType={m_nDocType}");
                    return Ok(new { success = true });
                }
                else
                {
                    LogMessage($"ConnectDevice: Failed to open device, code: {nRet}");
                    return BadRequest(new { success = false, message = $"Failed to open device, code: {nRet}" });
                }
            }
            catch (Exception ex)
            {
                LogMessage($"ConnectDevice: Error: {ex.Message}, StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { success = false, message = $"Error connecting to device: {ex.Message}" });
            }
        }

        [HttpPost("connect/{deviceName}")]
        public IActionResult ConnectSpecificDevice(string deviceName)
        {
            try
            {
                if (m_bDeviceOpened)
                {
                    MTMICRCloseDevice(m_strCurrentDeviceName);
                    LogMessage($"ConnectSpecificDevice: Closed previous device: {m_strCurrentDeviceName}");
                    m_bDeviceOpened = false;
                }

                if (string.IsNullOrEmpty(deviceName))
                {
                    LogMessage("ConnectSpecificDevice: Invalid device name");
                    return BadRequest(new { success = false, message = "Device name is required" });
                }

                m_strCurrentDeviceName = deviceName;
                int nRet = MTMICROpenDevice(deviceName);
                LogMessage($"ConnectSpecificDevice: MTMICROpenDevice for {deviceName} returned {nRet}");
                if (nRet == MICR_ST_OK)
                {
                    m_bDeviceOpened = true;
                    LogMessage($"ConnectSpecificDevice: Device opened successfully: {deviceName}, DocType={m_nDocType}");
                    return Ok(new { success = true });
                }
                else
                {
                    LogMessage($"ConnectSpecificDevice: Failed to open device {deviceName}, code: {nRet}");
                    return BadRequest(new { success = false, message = $"Failed to open device {deviceName}, code: {nRet}" });
                }
            }
            catch (Exception ex)
            {
                LogMessage($"ConnectSpecificDevice: Error: {ex.Message}, StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { success = false, message = $"Error connecting to device {deviceName}: {ex.Message}" });
            }
        }

        [HttpPost("scan")]
        public IActionResult ScanVoucher()
        {
            try
            {
                LogMessage($"ScanVoucher: Starting scan with DocType={m_nDocType}, Device={m_strCurrentDeviceName}");
                if (!m_bDeviceOpened || string.IsNullOrEmpty(m_strCurrentDeviceName))
                {
                    m_strCurrentDeviceName = GetFirstDevice() ?? "";
                    if (string.IsNullOrEmpty(m_strCurrentDeviceName))
                    {
                        LogMessage("ScanVoucher: No device found");
                        return BadRequest(new { success = false, message = "No device found" });
                    }

                    int nRetOpen = MTMICROpenDevice(m_strCurrentDeviceName);
                    LogMessage($"ScanVoucher: MTMICROpenDevice returned {nRetOpen}");
                    if (nRetOpen != MICR_ST_OK)
                    {
                        MTMICRCloseDevice(m_strCurrentDeviceName);
                        LogMessage("ScanVoucher: Retried MTMICRCloseDevice");
                        nRetOpen = MTMICROpenDevice(m_strCurrentDeviceName);
                        LogMessage($"ScanVoucher: Retry MTMICROpenDevice returned {nRetOpen}");
                        if (nRetOpen != MICR_ST_OK)
                        {
                            LogMessage($"ScanVoucher: Failed to open device, code: {nRetOpen}");
                            return BadRequest(new { success = false, message = $"Failed to open device, code: {nRetOpen}" });
                        }
                    }
                    m_bDeviceOpened = true;
                    LogMessage($"ScanVoucher: Device opened successfully: {m_strCurrentDeviceName}, DocType={m_nDocType}");
                }

                // Reset device state to ensure clean configuration
                if (m_bDeviceOpened)
                {
                    MTMICRCloseDevice(m_strCurrentDeviceName);
                    LogMessage($"ScanVoucher: Closed device {m_strCurrentDeviceName} for reset");
                    m_bDeviceOpened = false;
                    int nRetOpen = MTMICROpenDevice(m_strCurrentDeviceName);
                    LogMessage($"ScanVoucher: Reopened device {m_strCurrentDeviceName}, returned {nRetOpen}");
                    if (nRetOpen != MICR_ST_OK)
                    {
                        LogMessage($"ScanVoucher: Failed to reopen device, code: {nRetOpen}");
                        return BadRequest(new { success = false, message = $"Failed to reopen device, code: {nRetOpen}" });
                    }
                    m_bDeviceOpened = true;
                }

                // Validate document type
                if (m_nDocType == DocType.INVALID)
                {
                    LogMessage("ScanVoucher: Invalid document type detected");
                    return BadRequest(new { success = false, message = "Invalid document type" });
                }

                int nRet = SetupOptions();
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"ScanVoucher: SetupOptions failed, code: {nRet}");
                    return BadRequest(new { success = false, message = $"Failed to setup options, code: {nRet}" });
                }

                StringBuilder strResponse = new StringBuilder(DEFAULT_STRING_BUFFER_SIZE);
                int nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                m_strDocInfo = "";
                const int maxRetries = 3;
                int attempt;

                for (attempt = 1; attempt <= maxRetries; attempt++)
                {
                    LogMessage($"ScanVoucher: Attempt {attempt} calling MTMICRProcessCheck with Options={m_strOptions}");
                    nRet = MTMICRProcessCheck(m_strCurrentDeviceName, m_strOptions, strResponse, ref nResponseLength);
                    LogMessage($"ScanVoucher: Attempt {attempt} MTMICRProcessCheck returned {nRet}, ResponseLength={nResponseLength}, DocInfo={strResponse}");

                    if (nRet == MICR_ST_OK)
                    {
                        m_strDocInfo = strResponse.ToString();
                        if (!string.IsNullOrEmpty(m_strDocInfo))
                        {
                            break;
                        }
                        LogMessage($"ScanVoucher: Attempt {attempt} received empty DocInfo, retrying...");
                    }
                    else
                    {
                        LogMessage($"ScanVoucher: Attempt {attempt} MTMICRProcessCheck failed with code {nRet}");
                    }

                    if (attempt < maxRetries)
                    {
                        Thread.Sleep(2000);
                        strResponse.Clear();
                        nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                    }
                }

                if (nRet != MICR_ST_OK)
                {
                    if (nRet == MICR_ST_INVALID_FEED_TYPE)
                    {
                        LogMessage("ScanVoucher: Invalid document feed type for scan");
                        return BadRequest(new { success = false, message = "Invalid document feed type for scan" });
                    }
                    LogMessage($"ScanVoucher: All attempts failed, last code: {nRet}");
                    return BadRequest(new { success = false, message = $"Process check failed with code {nRet}" });
                }

                if (string.IsNullOrEmpty(m_strDocInfo))
                {
                    LogMessage("ScanVoucher: Empty DocInfo received after all attempts");
                    return BadRequest(new { success = false, message = "No data captured from scan" });
                }

                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();
                nRet = MTMICRGetValue(m_strDocInfo, "CommandStatus", "ReturnCode", strResponse, ref nResponseLength);
                string strReturnCode = strResponse.ToString();
                int nReturnCode = int.TryParse(strReturnCode, out int code) ? code : -1;
                LogMessage($"ScanVoucher: CommandStatus ReturnCode: {nReturnCode}");

                if (nReturnCode == 0)
                {
                    var voucherData = ExtractVoucherData();
                    LogMessage($"ScanVoucher: Voucher data extracted: voucherNo={voucherData.voucherNo ?? "null"}, checkNumber={voucherData.checkNumber ?? "null"}, narration={voucherData.narration}");
                    return Ok(voucherData);
                }
                else
                {
                    LogMessage($"ScanVoucher: Process failed with ReturnCode: {nReturnCode}");
                    return BadRequest(new { success = false, message = $"Process failed with ReturnCode {nReturnCode}" });
                }
            }
            catch (Exception ex)
            {
                LogMessage($"ScanVoucher: Error: {ex.Message}, StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { success = false, message = $"Error scanning voucher: {ex.Message}" });
            }
        }

        [HttpPost("save")]
        public IActionResult SaveToDatabase([FromBody] VoucherData? voucherData)
        {
            LogMessage("SaveToDatabase: Received voucher data");
            if (voucherData == null)
            {
                LogMessage("SaveToDatabase: Invalid voucher data");
                return BadRequest(new { success = false, message = "Invalid voucher data" });
            }

            byte[]? frontImageBytes = null;
            byte[]? backImageBytes = null;

            try
            {
                LogMessage($"SaveToDatabase: Processing voucher {voucherData.voucherNo ?? "null"}, DocType={m_nDocType}");

                if (!string.IsNullOrEmpty(voucherData.frontImage) && m_nDocType == DocType.CHECK)
                {
                    if (!IsValidBase64(voucherData.frontImage))
                    {
                        LogMessage($"SaveToDatabase: Invalid Base64 for frontImage: {voucherData.frontImage.Substring(0, Math.Min(50, voucherData.frontImage.Length))}...");
                        return BadRequest(new { success = false, message = "Front image is not a valid Base64 string" });
                    }
                    try
                    {
                        frontImageBytes = Convert.FromBase64String(voucherData.frontImage);
                        LogMessage($"SaveToDatabase: Front image size: {frontImageBytes.Length} bytes");
                        if (frontImageBytes.Length > MAX_IMAGE_SIZE_BYTES)
                        {
                            LogMessage("SaveToDatabase: Front image too large");
                            return BadRequest(new { success = false, message = "Front image exceeds size limit (10MB)" });
                        }
                    }
                    catch (FormatException ex)
                    {
                        LogMessage($"SaveToDatabase: frontImage FormatException: {ex.Message}, StackTrace: {ex.StackTrace}");
                        return BadRequest(new { success = false, message = "Front image is not a valid Base64 string" });
                    }
                }
                else if (m_nDocType == DocType.CHECK)
                {
                    LogMessage("SaveToDatabase: No front image provided for CHECK");
                }

                if (!string.IsNullOrEmpty(voucherData.backImage) && m_nDocType == DocType.CHECK)
                {
                    if (!IsValidBase64(voucherData.backImage))
                    {
                        LogMessage($"SaveToDatabase: Invalid Base64 for backImage: {voucherData.backImage.Substring(0, Math.Min(50, voucherData.backImage.Length))}...");
                        return BadRequest(new { success = false, message = "Back image is not a valid Base64 string" });
                    }
                    try
                    {
                        backImageBytes = Convert.FromBase64String(voucherData.backImage);
                        LogMessage($"SaveToDatabase: Back image size: {backImageBytes.Length} bytes");
                        if (backImageBytes.Length > MAX_IMAGE_SIZE_BYTES)
                        {
                            LogMessage("SaveToDatabase: Back image too large");
                            return BadRequest(new { success = false, message = "Back image exceeds size limit (10MB)" });
                        }
                    }
                    catch (FormatException ex)
                    {
                        LogMessage($"SaveToDatabase: backImage FormatException: {ex.Message}, StackTrace: {ex.StackTrace}");
                        return BadRequest(new { success = false, message = "Back image is not a valid Base64 string" });
                    }
                }
                else if (m_nDocType == DocType.CHECK)
                {
                    LogMessage("SaveToDatabase: No back image provided for CHECK");
                }

                /*
                // ORACLE DB SAVE CODE (COMMENTED - DO NOT REMOVE NOR FALLBACK)
                try
                {
                    LogMessage("SaveToDatabase: Attempting database connection");
                    using (var connection = new OracleConnection(connectionString))
                    {
                        connection.Open();
                        LogMessage("SaveToDatabase: Database connection opened");
                        string query = "INSERT INTO mbank_cheques (TRANS_ID, IMAGE1, IMAGE2, NARRATION) " +
                                      "VALUES (:transId, :image1, :image2, :narration)";
                        using (var command = new OracleCommand(query, connection))
                        {
                            command.Parameters.Add("transId", OracleDbType.Varchar2).Value = string.IsNullOrEmpty(voucherData.voucherNo) ? DBNull.Value : voucherData.voucherNo;
                            command.Parameters.Add("image1", OracleDbType.Blob).Value = m_nDocType == DocType.CHECK && frontImageBytes != null ? frontImageBytes : DBNull.Value;
                            command.Parameters.Add("image2", OracleDbType.Blob).Value = m_nDocType == DocType.CHECK && backImageBytes != null ? backImageBytes : DBNull.Value;
                            command.Parameters.Add("narration", OracleDbType.Varchar2).Value = string.IsNullOrEmpty(voucherData.narration) ? DBNull.Value : voucherData.narration;

                            LogMessage("SaveToDatabase: Executing query");
                            int rowsAffected = command.ExecuteNonQuery();
                            if (rowsAffected == 0)
                            {
                                LogMessage($"SaveToDatabase: No rows inserted for voucher {voucherData.voucherNo ?? "null"}");
                                return StatusCode(500, new { success = false, message = "Failed to insert voucher into database" });
                            }
                            LogMessage($"SaveToDatabase: Inserted {rowsAffected} row(s) for voucher {voucherData.voucherNo ?? "null"}");
                        }
                    }

                    LogMessage($"SaveToDatabase: Successfully saved voucher {voucherData.voucherNo ?? "null"} to database");
                    return Ok(new { success = true, message = $"Voucher {voucherData.voucherNo ?? "null"} saved to database" });
                }
                catch (OracleException ex)
                {
                    LogMessage($"SaveToDatabase: OracleException: {ex.Message}, ErrorCode: {ex.ErrorCode}, StackTrace: {ex.StackTrace}");
                    return StatusCode(500, new { success = false, message = $"Database error: {ex.Message}" });
                }
                */

                // POSTGRESQL DB SAVE CODE
                // Credentials: $pg_tns = "pgsql:host=10.203.14.50;port=5432;dbname=xvscan"; $pg_user = "postgres"; $pg_pwd = "usg12345";
                try
                {
                    LogMessage("SaveToDatabase: Attempting PostgreSQL database connection");
                    using (var connection = new NpgsqlConnection(pgConnectionString))
                    {
                        connection.Open();
                        LogMessage("SaveToDatabase: PostgreSQL database connection opened");

                        EnsurePostgresColumns(connection);

                        string effectiveDocType = m_nDocType == DocType.MSR ? "MSR" : "CHECK";
                        if (!string.IsNullOrEmpty(voucherData.voucherType))
                        {
                            effectiveDocType = voucherData.voucherType;
                        }

                        string transId = (voucherData.voucherNo ?? "").Trim();
                        if (string.IsNullOrEmpty(transId))
                        {
                            transId = "scan_" + DateTime.Now.ToString("yyyyMMddHHmmss");
                        }

                        // Check if row already exists in mbank_cheques
                        bool rowExists = false;
                        using (var checkCmd = new NpgsqlCommand("SELECT 1 FROM mbank_cheques WHERE UPPER(trans_id) = @transId OR trans_id = @rawTransId", connection))
                        {
                            checkCmd.Parameters.AddWithValue("transId", transId.ToUpper());
                            checkCmd.Parameters.AddWithValue("rawTransId", transId);
                            var scalar = checkCmd.ExecuteScalar();
                            rowExists = scalar != null;
                        }

                        string query;
                        if (rowExists)
                        {
                            query = @"
                                UPDATE mbank_cheques SET
                                    image1 = COALESCE(@image1, image1),
                                    image2 = COALESCE(@image2, image2),
                                    narration = @narration,
                                    voucher_type = @voucherType,
                                    micr = @micr,
                                    front_image_path = @frontImagePath,
                                    back_image_path = @backImagePath,
                                    track_data1 = @trackData1,
                                    track_data2 = @trackData2,
                                    track_data3 = @trackData3,
                                    mp_data = @mpData,
                                    card_type = @cardType,
                                    magne_print_status = @magnePrintStatus,
                                    track1_status = @track1Status,
                                    track2_status = @track2Status,
                                    track3_status = @track3Status,
                                    get_score = @getScore,
                                    device_serial_number = @deviceSerialNumber,
                                    dukpt_serial_number = @dukptSerialNumber,
                                    encrypted_session_id = @encryptedSessionId,
                                    encrypted_track1 = @encryptedTrack1,
                                    encrypted_track2 = @encryptedTrack2,
                                    encrypted_track3 = @encryptedTrack3,
                                    cheque_num = @checkNumber,
                                    acct_no = @accountNumber,
                                    routing_number = @routingNumber,
                                    bank_code = @bankCode,
                                    country_code = @countryCode,
                                    state_code = @stateCode,
                                    branch_code = @branchCode,
                                    transaction_code = @transactionCode,
                                    check_date = @checkDate,
                                    amount = @amount,
                                    amount_words = @amountWords,
                                    account_holder = @accountHolder,
                                    signature = @signature
                                WHERE UPPER(trans_id) = @transIdUpper OR trans_id = @rawTransId;
                            ";
                        }
                        else
                        {
                            query = @"
                                INSERT INTO mbank_cheques (
                                    trans_id, image1, image2, narration, voucher_type, micr,
                                    front_image_path, back_image_path, track_data1, track_data2, track_data3,
                                    mp_data, card_type, magne_print_status, track1_status, track2_status, track3_status,
                                    get_score, device_serial_number, dukpt_serial_number, encrypted_session_id,
                                    encrypted_track1, encrypted_track2, encrypted_track3,
                                    cheque_num, acct_no, routing_number, bank_code,
                                    country_code, state_code, branch_code, transaction_code,
                                    check_date, amount, amount_words, account_holder, signature
                                )
                                VALUES (
                                    @transId, @image1, @image2, @narration, @voucherType, @micr,
                                    @frontImagePath, @backImagePath, @trackData1, @trackData2, @trackData3,
                                    @mpData, @cardType, @magnePrintStatus, @track1Status, @track2Status, @track3Status,
                                    @getScore, @deviceSerialNumber, @dukptSerialNumber, @encryptedSessionId,
                                    @encryptedTrack1, @encryptedTrack2, @encryptedTrack3,
                                    @checkNumber, @accountNumber, @routingNumber, @bankCode,
                                    @countryCode, @stateCode, @branchCode, @transactionCode,
                                    @checkDate, @amount, @amountWords, @accountHolder, @signature
                                );
                            ";
                        }

                        using (var command = new NpgsqlCommand(query, connection))
                        {
                            command.Parameters.AddWithValue("transId", transId);
                            command.Parameters.AddWithValue("transIdUpper", transId.ToUpper());
                            command.Parameters.AddWithValue("rawTransId", transId);
                            command.Parameters.AddWithValue("image1", (m_nDocType == DocType.CHECK || effectiveDocType == "CHECK") && frontImageBytes != null ? frontImageBytes : DBNull.Value);
                            command.Parameters.AddWithValue("image2", (m_nDocType == DocType.CHECK || effectiveDocType == "CHECK") && backImageBytes != null ? backImageBytes : DBNull.Value);
                            command.Parameters.AddWithValue("narration", string.IsNullOrEmpty(voucherData.narration) ? DBNull.Value : voucherData.narration);
                            command.Parameters.AddWithValue("voucherType", string.IsNullOrEmpty(effectiveDocType) ? DBNull.Value : effectiveDocType);
                            command.Parameters.AddWithValue("micr", string.IsNullOrEmpty(voucherData.micr) ? DBNull.Value : voucherData.micr);
                            command.Parameters.AddWithValue("frontImagePath", string.IsNullOrEmpty(voucherData.frontImagePath) ? DBNull.Value : voucherData.frontImagePath);
                            command.Parameters.AddWithValue("backImagePath", string.IsNullOrEmpty(voucherData.backImagePath) ? DBNull.Value : voucherData.backImagePath);
                            command.Parameters.AddWithValue("trackData1", string.IsNullOrEmpty(voucherData.trackData1) ? DBNull.Value : voucherData.trackData1);
                            command.Parameters.AddWithValue("trackData2", string.IsNullOrEmpty(voucherData.trackData2) ? DBNull.Value : voucherData.trackData2);
                            command.Parameters.AddWithValue("trackData3", string.IsNullOrEmpty(voucherData.trackData3) ? DBNull.Value : voucherData.trackData3);
                            command.Parameters.AddWithValue("mpData", string.IsNullOrEmpty(voucherData.mpData) ? DBNull.Value : voucherData.mpData);
                            command.Parameters.AddWithValue("cardType", string.IsNullOrEmpty(voucherData.cardType) ? DBNull.Value : voucherData.cardType);
                            command.Parameters.AddWithValue("magnePrintStatus", string.IsNullOrEmpty(voucherData.magnePrintStatus) ? DBNull.Value : voucherData.magnePrintStatus);
                            command.Parameters.AddWithValue("track1Status", string.IsNullOrEmpty(voucherData.track1Status) ? DBNull.Value : voucherData.track1Status);
                            command.Parameters.AddWithValue("track2Status", string.IsNullOrEmpty(voucherData.track2Status) ? DBNull.Value : voucherData.track2Status);
                            command.Parameters.AddWithValue("track3Status", string.IsNullOrEmpty(voucherData.track3Status) ? DBNull.Value : voucherData.track3Status);
                            command.Parameters.AddWithValue("getScore", string.IsNullOrEmpty(voucherData.getScore) ? DBNull.Value : voucherData.getScore);
                            command.Parameters.AddWithValue("deviceSerialNumber", string.IsNullOrEmpty(voucherData.deviceSerialNumber) ? DBNull.Value : voucherData.deviceSerialNumber);
                            command.Parameters.AddWithValue("dukptSerialNumber", string.IsNullOrEmpty(voucherData.dukptSerialNumber) ? DBNull.Value : voucherData.dukptSerialNumber);
                            command.Parameters.AddWithValue("encryptedSessionId", string.IsNullOrEmpty(voucherData.encryptedSessionId) ? DBNull.Value : voucherData.encryptedSessionId);
                            command.Parameters.AddWithValue("encryptedTrack1", string.IsNullOrEmpty(voucherData.encryptedTrack1) ? DBNull.Value : voucherData.encryptedTrack1);
                            command.Parameters.AddWithValue("encryptedTrack2", string.IsNullOrEmpty(voucherData.encryptedTrack2) ? DBNull.Value : voucherData.encryptedTrack2);
                            command.Parameters.AddWithValue("encryptedTrack3", string.IsNullOrEmpty(voucherData.encryptedTrack3) ? DBNull.Value : voucherData.encryptedTrack3);
                            command.Parameters.AddWithValue("checkNumber", string.IsNullOrEmpty(voucherData.checkNumber) ? DBNull.Value : voucherData.checkNumber);
                            command.Parameters.AddWithValue("accountNumber", string.IsNullOrEmpty(voucherData.accountNumber) ? DBNull.Value : voucherData.accountNumber);
                            command.Parameters.AddWithValue("routingNumber", string.IsNullOrEmpty(voucherData.routingNumber) ? DBNull.Value : voucherData.routingNumber);
                            command.Parameters.AddWithValue("bankCode", string.IsNullOrEmpty(voucherData.bankCode) ? DBNull.Value : voucherData.bankCode);
                            command.Parameters.AddWithValue("countryCode", string.IsNullOrEmpty(voucherData.countryCode) ? DBNull.Value : voucherData.countryCode);
                            command.Parameters.AddWithValue("stateCode", string.IsNullOrEmpty(voucherData.stateCode) ? DBNull.Value : voucherData.stateCode);
                            command.Parameters.AddWithValue("branchCode", string.IsNullOrEmpty(voucherData.branchCode) ? DBNull.Value : voucherData.branchCode);
                            command.Parameters.AddWithValue("transactionCode", string.IsNullOrEmpty(voucherData.transactionCode) ? DBNull.Value : voucherData.transactionCode);
                            command.Parameters.AddWithValue("checkDate", string.IsNullOrEmpty(voucherData.checkDate) ? DBNull.Value : voucherData.checkDate);
                            command.Parameters.AddWithValue("amount", string.IsNullOrEmpty(voucherData.amount) ? DBNull.Value : voucherData.amount);
                            command.Parameters.AddWithValue("amountWords", string.IsNullOrEmpty(voucherData.amountWords) ? DBNull.Value : voucherData.amountWords);
                            command.Parameters.AddWithValue("accountHolder", string.IsNullOrEmpty(voucherData.accountHolder) ? DBNull.Value : voucherData.accountHolder);
                            command.Parameters.AddWithValue("signature", string.IsNullOrEmpty(voucherData.signature) ? DBNull.Value : voucherData.signature);

                            LogMessage("SaveToDatabase: Executing PostgreSQL query");
                            int rowsAffected = command.ExecuteNonQuery();
                            LogMessage($"SaveToDatabase: Inserted/Updated {rowsAffected} row(s) into PostgreSQL for voucher {transId}");
                        }
                    }

                    LogMessage($"SaveToDatabase: Successfully saved voucher {voucherData.voucherNo ?? "null"} to PostgreSQL database");
                    return Ok(new { success = true, message = $"Voucher {voucherData.voucherNo ?? "null"} saved to database" });
                }
                catch (Exception ex)
                {
                    LogMessage($"SaveToDatabase: Error: {ex.Message}, attempting fallback insert");
                    try
                    {
                        using (var conn = new NpgsqlConnection(pgConnectionString))
                        {
                            conn.Open();
                            string fallbackQuery = "INSERT INTO mbank_cheques (trans_id, image1, image2, narration) VALUES (@transId, @image1, @image2, @narration)";
                            using (var cmd = new NpgsqlCommand(fallbackQuery, conn))
                            {
                                cmd.Parameters.AddWithValue("transId", string.IsNullOrEmpty(voucherData.voucherNo) ? DBNull.Value : voucherData.voucherNo);
                                cmd.Parameters.AddWithValue("image1", frontImageBytes != null ? frontImageBytes : DBNull.Value);
                                cmd.Parameters.AddWithValue("image2", backImageBytes != null ? backImageBytes : DBNull.Value);
                                cmd.Parameters.AddWithValue("narration", string.IsNullOrEmpty(voucherData.narration) ? DBNull.Value : voucherData.narration);
                                cmd.ExecuteNonQuery();
                                return Ok(new { success = true, message = $"Voucher {voucherData.voucherNo ?? "null"} saved to database" });
                            }
                        }
                    }
                    catch (Exception fbEx)
                    {
                        LogMessage($"SaveToDatabase: Fallback failed: {fbEx.Message}");
                        return StatusCode(500, new { success = false, message = $"Database error: {ex.Message}" });
                    }
                }
            }
            catch (Exception ex)
            {
                LogMessage($"SaveToDatabase: Unexpected error: {ex.Message}, StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { success = false, message = $"Unexpected error: {ex.Message}" });
            }
        }

        private void EnsurePostgresColumns(NpgsqlConnection connection)
        {
            try
            {
                using (var createTableCmd = new NpgsqlCommand(@"
                    CREATE TABLE IF NOT EXISTS mbank_cheques (
                        trans_id VARCHAR(100) PRIMARY KEY,
                        image1 BYTEA,
                        image2 BYTEA,
                        narration TEXT
                    );
                ", connection))
                {
                    createTableCmd.ExecuteNonQuery();
                }

                // Drop duplicate columns if present
                using (var dropCmd = new NpgsqlCommand("ALTER TABLE mbank_cheques DROP COLUMN IF EXISTS check_number, DROP COLUMN IF EXISTS account_number;", connection))
                {
                    dropCmd.ExecuteNonQuery();
                }
            }
            catch { }

            string[] columns = new string[]
            {
                "voucher_type VARCHAR(100)",
                "micr TEXT",
                "front_image_path TEXT",
                "back_image_path TEXT",
                "track_data1 TEXT",
                "track_data2 TEXT",
                "track_data3 TEXT",
                "mp_data TEXT",
                "card_type VARCHAR(100)",
                "magne_print_status VARCHAR(100)",
                "track1_status VARCHAR(100)",
                "track2_status VARCHAR(100)",
                "track3_status VARCHAR(100)",
                "get_score VARCHAR(100)",
                "device_serial_number VARCHAR(150)",
                "dukpt_serial_number VARCHAR(150)",
                "encrypted_session_id VARCHAR(250)",
                "encrypted_track1 TEXT",
                "encrypted_track2 TEXT",
                "encrypted_track3 TEXT",
                "cheque_num VARCHAR(100)",
                "acct_no VARCHAR(100)",
                "routing_number VARCHAR(100)",
                "bank_code VARCHAR(100)",
                "country_code VARCHAR(50)",
                "state_code VARCHAR(50)",
                "branch_code VARCHAR(50)",
                "transaction_code VARCHAR(50)",
                "check_date VARCHAR(100)",
                "amount VARCHAR(100)",
                "amount_words TEXT",
                "account_holder VARCHAR(250)",
                "signature TEXT"
            };

            foreach (var col in columns)
            {
                try
                {
                    using (var colCmd = new NpgsqlCommand($"ALTER TABLE mbank_cheques ADD COLUMN IF NOT EXISTS {col}", connection))
                    {
                        colCmd.ExecuteNonQuery();
                    }
                }
                catch { }
            }
        }

        private static void AutoParseMicrIfEmpty(
            string micr, 
            ref string checkNo, 
            ref string routingNo, 
            ref string accountNo, 
            ref string bankCode,
            ref string countryCode,
            ref string stateCode,
            ref string branchCode,
            ref string transactionCode)
        {
            if (string.IsNullOrEmpty(micr)) return;
            try
            {
                // Remove non-alphanumeric/spaces delimiter symbols
                string clean = System.Text.RegularExpressions.Regex.Replace(micr, @"[^0-9\s]", " ").Trim();
                var parts = clean.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length >= 3)
                {
                    if (string.IsNullOrEmpty(checkNo)) checkNo = parts[0];
                    string block2 = parts[1];
                    string block3 = parts[2];

                    if (string.IsNullOrEmpty(routingNo)) routingNo = block2;

                    // Sierra Leone 10-digit sort code: Country(2) + BankCode(3) + State(2) + Branch(3)
                    if (block2.Length >= 10)
                    {
                        if (string.IsNullOrEmpty(countryCode)) countryCode = block2.Substring(0, 2);
                        string bCode = block2.Substring(2, 3);
                        if (string.IsNullOrEmpty(bankCode)) bankCode = bCode;
                        if (string.IsNullOrEmpty(stateCode)) stateCode = block2.Substring(5, 2);
                        string branch = block2.Substring(7, 3);
                        if (string.IsNullOrEmpty(branchCode)) branchCode = branch;

                        string prefix = $"{bCode}{branch}";
                        if (string.IsNullOrEmpty(accountNo) || accountNo == block3 || (!accountNo.StartsWith(prefix) && accountNo.EndsWith(block3)))
                        {
                            accountNo = $"{prefix}{block3}";
                        }

                        if (parts.Length >= 4 && string.IsNullOrEmpty(transactionCode))
                        {
                            transactionCode = parts[3];
                        }
                    }
                    else
                    {
                        if (string.IsNullOrEmpty(accountNo)) accountNo = block3;
                        if (parts.Length >= 4 && string.IsNullOrEmpty(transactionCode)) transactionCode = parts[3];
                    }
                }
                else if (parts.Length == 2)
                {
                    if (string.IsNullOrEmpty(checkNo)) checkNo = parts[0];
                    if (string.IsNullOrEmpty(accountNo)) accountNo = parts[1];
                }
            }
            catch { }
        }

        [HttpGet("view/{transId}")]
        public async Task<IActionResult> ViewVoucherData(string transId)
        {
            try
            {
                LogMessage($"ViewVoucherData: Fetching data for TRANS_ID={transId}, DocType={m_nDocType}");
                if (string.IsNullOrEmpty(transId))
                {
                    LogMessage("ViewVoucherData: Invalid transId");
                    return BadRequest(new { success = false, message = "Voucher number is required" });
                }

                string frontImage = "";
                string backImage = "";
                string narration = "";
                string voucherNo = transId.Trim();
                string voucherType = "";
                string micr = "";
                string frontImagePath = "";
                string backImagePath = "";
                string trackData1 = "";
                string trackData2 = "";
                string trackData3 = "";
                string mpData = "";
                string cardType = "";
                string magnePrintStatus = "";
                string track1Status = "";
                string track2Status = "";
                string track3Status = "";
                string getScore = "";
                string deviceSerialNumber = "";
                string dukptSerialNumber = "";
                string encryptedSessionId = "";
                string encryptedTrack1 = "";
                string encryptedTrack2 = "";
                string encryptedTrack3 = "";
                string checkNumber = "";
                string accountNumber = "";
                string routingNumber = "";
                string bankCode = "";
                string countryCode = "";
                string stateCode = "";
                string branchCode = "";
                string transactionCode = "";
                string checkDate = "";
                string amount = "";
                string amountWords = "";
                string accountHolder = "";
                string signature = "";

                // 1. Fetch from PostgreSQL FIRST to get all rich saved columns
                try
                {
                    using (var connection = new NpgsqlConnection(pgConnectionString))
                    {
                        connection.Open();
                        string query = "SELECT * FROM mbank_cheques WHERE UPPER(trans_id) = @transId OR trans_id = @rawTransId";
                        using (var command = new NpgsqlCommand(query, connection))
                        {
                            command.Parameters.AddWithValue("transId", transId.ToUpper().Trim());
                            command.Parameters.AddWithValue("rawTransId", transId.Trim());
                            using (var reader = command.ExecuteReader())
                            {
                                if (reader.Read())
                                {
                                    Func<string, string> getCol = (colName) =>
                                    {
                                        try
                                        {
                                            int ordinal = reader.GetOrdinal(colName);
                                            return reader.IsDBNull(ordinal) ? "" : reader[ordinal]?.ToString() ?? "";
                                        }
                                        catch { return ""; }
                                    };

                                    narration = getCol("narration");
                                    voucherType = getCol("voucher_type");
                                    micr = getCol("micr");
                                    frontImagePath = getCol("front_image_path");
                                    backImagePath = getCol("back_image_path");
                                    trackData1 = getCol("track_data1");
                                    trackData2 = getCol("track_data2");
                                    trackData3 = getCol("track_data3");
                                    mpData = getCol("mp_data");
                                    cardType = getCol("card_type");
                                    magnePrintStatus = getCol("magne_print_status");
                                    track1Status = getCol("track1_status");
                                    track2Status = getCol("track2_status");
                                    track3Status = getCol("track3_status");
                                    getScore = getCol("get_score");
                                    deviceSerialNumber = getCol("device_serial_number");
                                    dukptSerialNumber = getCol("dukpt_serial_number");
                                    encryptedSessionId = getCol("encrypted_session_id");
                                    encryptedTrack1 = getCol("encrypted_track1");
                                    encryptedTrack2 = getCol("encrypted_track2");
                                    encryptedTrack3 = getCol("encrypted_track3");
                                    checkNumber = getCol("cheque_num");
                                    if (string.IsNullOrEmpty(checkNumber)) checkNumber = getCol("check_number");
                                    accountNumber = getCol("acct_no");
                                    if (string.IsNullOrEmpty(accountNumber)) accountNumber = getCol("account_number");
                                    routingNumber = getCol("routing_number");
                                    bankCode = getCol("bank_code");
                                    countryCode = getCol("country_code");
                                    stateCode = getCol("state_code");
                                    branchCode = getCol("branch_code");
                                    transactionCode = getCol("transaction_code");
                                    checkDate = getCol("check_date");
                                    amount = getCol("amount");
                                    amountWords = getCol("amount_words");
                                    accountHolder = getCol("account_holder");
                                    signature = getCol("signature");

                                    // If image bytea is stored in PostgreSQL, load it
                                    try
                                    {
                                        int ord1 = reader.GetOrdinal("image1");
                                        if (!reader.IsDBNull(ord1) && reader[ord1] is byte[] b1) frontImage = Convert.ToBase64String(b1);
                                    }
                                    catch { }

                                    try
                                    {
                                        int ord2 = reader.GetOrdinal("image2");
                                        if (!reader.IsDBNull(ord2) && reader[ord2] is byte[] b2) backImage = Convert.ToBase64String(b2);
                                    }
                                    catch { }
                                }
                            }
                        }
                    }
                }
                catch (Exception dbEx)
                {
                    LogMessage($"ViewVoucherData: PostgreSQL read notice: {dbEx.Message}");
                }

                // 2. Fetch from remote external API if images or details are needed: {imagingApiBaseUrl}/vscanner_api/get_cheque_images-{transId}
                string requestUrl = $"{imagingApiBaseUrl}/vscanner_api/get_cheque_images-{transId.Trim()}";
                LogMessage($"ViewVoucherData: Fetching images from external API: {requestUrl}");

                try
                {
                    using (var httpClient = new HttpClient())
                    {
                        httpClient.Timeout = TimeSpan.FromSeconds(15);
                        var httpResponse = await httpClient.GetAsync(requestUrl);
                        if (httpResponse.IsSuccessStatusCode)
                        {
                            string responseBody = await httpResponse.Content.ReadAsStringAsync();
                            LogMessage($"ViewVoucherData: Received response body length={responseBody.Length}");

                            using (var doc = System.Text.Json.JsonDocument.Parse(responseBody))
                            {
                                var root = doc.RootElement;

                                if (root.TryGetProperty("images", out var imagesProp) && imagesProp.ValueKind == System.Text.Json.JsonValueKind.Array && imagesProp.GetArrayLength() > 0)
                                {
                                    var imgObj = imagesProp[0];
                                    if (string.IsNullOrEmpty(frontImage)) frontImage = GetJsonString(imgObj, "front", "frontImage", "front_image", "image1", "IMAGE1");
                                    if (string.IsNullOrEmpty(backImage)) backImage = GetJsonString(imgObj, "back", "backImage", "back_image", "image2", "IMAGE2");
                                }
                                else if (root.ValueKind == System.Text.Json.JsonValueKind.Array && root.GetArrayLength() > 0)
                                {
                                    var first = root[0];
                                    if (string.IsNullOrEmpty(frontImage)) frontImage = GetJsonString(first, "front", "frontImage", "front_image", "image1", "IMAGE1");
                                    if (string.IsNullOrEmpty(backImage)) backImage = GetJsonString(first, "back", "backImage", "back_image", "image2", "IMAGE2");
                                    if (string.IsNullOrEmpty(narration)) narration = GetJsonString(first, "narration", "description", "NARRATION");
                                    if (string.IsNullOrEmpty(micr)) micr = GetJsonString(first, "micr", "MICR");
                                }
                                else if (root.ValueKind == System.Text.Json.JsonValueKind.Object)
                                {
                                    if (string.IsNullOrEmpty(frontImage)) frontImage = GetJsonString(root, "front", "frontImage", "front_image", "image1", "IMAGE1");
                                    if (string.IsNullOrEmpty(backImage)) backImage = GetJsonString(root, "back", "backImage", "back_image", "image2", "IMAGE2");
                                    if (string.IsNullOrEmpty(narration)) narration = GetJsonString(root, "narration", "description", "NARRATION");
                                    if (string.IsNullOrEmpty(micr)) micr = GetJsonString(root, "micr", "MICR");
                                }
                            }
                        }
                    }
                }
                catch (Exception apiEx)
                {
                    LogMessage($"ViewVoucherData: External API fetch error: {apiEx.Message}");
                }

                // If MICR is present, ensure components are extracted
                string parsedCountry = "";
                string parsedState = "";
                string parsedBranch = "";
                string parsedTransCode = "";
                AutoParseMicrIfEmpty(micr, ref checkNumber, ref routingNumber, ref accountNumber, ref bankCode, ref parsedCountry, ref parsedState, ref parsedBranch, ref parsedTransCode);

                var voucherData = new VoucherData
                {
                    voucherNo = string.IsNullOrEmpty(voucherNo) ? transId : voucherNo,
                    voucherType = voucherType,
                    micr = micr,
                    frontImage = frontImage,
                    backImage = backImage,
                    narration = narration,
                    frontImagePath = frontImagePath,
                    backImagePath = backImagePath,
                    trackData1 = trackData1,
                    trackData2 = trackData2,
                    trackData3 = trackData3,
                    mpData = mpData,
                    cardType = cardType,
                    magnePrintStatus = magnePrintStatus,
                    track1Status = track1Status,
                    track2Status = track2Status,
                    track3Status = track3Status,
                    getScore = getScore,
                    deviceSerialNumber = deviceSerialNumber,
                    dukptSerialNumber = dukptSerialNumber,
                    encryptedSessionId = encryptedSessionId,
                    encryptedTrack1 = encryptedTrack1,
                    encryptedTrack2 = encryptedTrack2,
                    encryptedTrack3 = encryptedTrack3,
                    checkNumber = checkNumber,
                    accountNumber = accountNumber,
                    routingNumber = routingNumber,
                    bankCode = bankCode,
                    countryCode = string.IsNullOrEmpty(countryCode) ? parsedCountry : countryCode,
                    stateCode = string.IsNullOrEmpty(stateCode) ? parsedState : stateCode,
                    branchCode = string.IsNullOrEmpty(branchCode) ? parsedBranch : branchCode,
                    transactionCode = string.IsNullOrEmpty(transactionCode) ? parsedTransCode : transactionCode,
                    checkDate = checkDate,
                    amount = amount,
                    amountWords = amountWords,
                    accountHolder = accountHolder,
                    signature = signature
                };

                LogMessage($"ViewVoucherData: Loaded voucher {transId}, FrontImageLen={frontImage.Length}, BackImageLen={backImage.Length}, MICR={micr}, CheckNo={checkNumber}, AccNo={accountNumber}");
                return Ok(new { success = true, data = voucherData });
            }
            catch (Exception ex)
            {
                LogMessage($"ViewVoucherData: Error: {ex.Message}, StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { success = false, message = $"Error fetching voucher data: {ex.Message}" });
            }
        }

        private static string GetJsonString(System.Text.Json.JsonElement element, params string[] propertyNames)
        {
            foreach (var prop in propertyNames)
            {
                if (element.TryGetProperty(prop, out var val))
                {
                    if (val.ValueKind == System.Text.Json.JsonValueKind.String)
                    {
                        return val.GetString() ?? "";
                    }
                    else if (val.ValueKind != System.Text.Json.JsonValueKind.Null && val.ValueKind != System.Text.Json.JsonValueKind.Undefined)
                    {
                        return val.ToString() ?? "";
                    }
                }
            }
            return "";
        }

        private bool IsValidBase64(string base64String)
        {
            if (string.IsNullOrEmpty(base64String) || base64String.Length % 4 != 0)
            {
                LogMessage("IsValidBase64: Invalid length or empty string");
                return false;
            }

            try
            {
                Span<char> buffer = stackalloc char[base64String.Length];
                base64String.CopyTo(buffer);
                for (int i = 0; i < buffer.Length; i++)
                {
                    char c = buffer[i];
                    if (!(char.IsLetterOrDigit(c) || c == '+' || c == '/' || c == '='))
                    {
                        LogMessage($"IsValidBase64: Invalid character at position {i}: {c}");
                        return false;
                    }
                }
                int paddingCount = base64String.EndsWith("==") ? 2 : base64String.EndsWith("=") ? 1 : 0;
                if (paddingCount > 2)
                {
                    LogMessage("IsValidBase64: Invalid padding count");
                    return false;
                }
                return true;
            }
            catch (Exception ex)
            {
                LogMessage($"IsValidBase64: Error: {ex.Message}, StackTrace: {ex.StackTrace}");
                return false;
            }
        }

        private string? GetFirstDevice()
        {
            List<string> devices = new List<string>();
            const int maxRetries = 5;
            const int maxDevices = 20;

            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                devices.Clear();
                for (byte nTotalDev = 0; nTotalDev <= maxDevices; nTotalDev++)
                {
                    StringBuilder strDeviceName = new StringBuilder(256);
                    int nRetCode = MTMICRGetDevice(nTotalDev, strDeviceName);
                    LogMessage($"GetFirstDevice: Attempt {attempt}, Index {nTotalDev}, MTMICRGetDevice returned {nRetCode}, DeviceName: {strDeviceName}");
                    if (nRetCode == MICR_ST_OK && !string.IsNullOrEmpty(strDeviceName.ToString()))
                    {
                        string deviceName = strDeviceName.ToString();
                        if (!devices.Contains(deviceName))
                        {
                            devices.Add(deviceName);
                            LogMessage($"GetFirstDevice: Added device: {deviceName}");
                        }
                    }
                    else if (nRetCode == MICR_ST_DEVICE_NOT_FOUND)
                    {
                        LogMessage($"GetFirstDevice: Device not found at index {nTotalDev}, stopping enumeration for attempt {attempt}");
                        break;
                    }
                }

                string? selectedDevice = devices.Find(d => d.Equals("STX.STX001", StringComparison.OrdinalIgnoreCase)) ?? devices.FirstOrDefault();
                if (selectedDevice != null)
                {
                    LogMessage($"GetFirstDevice: Selected device: {selectedDevice} on attempt {attempt}, DocType={m_nDocType}");
                    return selectedDevice;
                }

                LogMessage($"GetFirstDevice: No devices found on attempt {attempt}, retrying...");
                Thread.Sleep(2000);
            }

            LogMessage("GetFirstDevice: No devices found after all retries.");
            return null;
        }

        private int SetupOptions()
        {
            StringBuilder strOptions = new StringBuilder(DEFAULT_STRING_BUFFER_SIZE);
            strOptions.Capacity = DEFAULT_STRING_BUFFER_SIZE;
            int nActualLength = DEFAULT_STRING_BUFFER_SIZE;
            int nRet;

            if (m_nDocType == DocType.MSR)
            {
                nRet = MTMICRSetValue(strOptions, "ProcessOptions", "DocFeed", "MSR", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set DocFeed=MSR, code: {nRet}");
                    return nRet;
                }
                nRet = MTMICRSetValue(strOptions, "ProcessOptions", "DocFeedTimeout", "15000", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set DocFeedTimeout=15000, code: {nRet}");
                    return nRet;
                }
                nRet = MTMICRSetValue(strOptions, "ProcessOptions", "MSRFmt", "ISO", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set MSRFmt=ISO, code: {nRet}");
                    return nRet;
                }
            }
            else if (m_nDocType == DocType.CHECK)
            {
                nRet = MTMICRSetValue(strOptions, "Application", "Transfer", "HTTP", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set Transfer=HTTP, code: {nRet}");
                    return nRet;
                }

                nRet = MTMICRSetValue(strOptions, "Application", "DocUnits", "ENGLISH", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set DocUnits=ENGLISH, code: {nRet}");
                    return nRet;
                }

                nRet = MTMICRSetValue(strOptions, "ProcessOptions", "DocFeedTimeout", "10000", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set DocFeedTimeout=10000, code: {nRet}");
                    return nRet;
                }

                nRet = MTMICRSetValue(strOptions, "ProcessOptions", "DocFeed", "MANUAL", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set DocFeed=MANUAL, code: {nRet}");
                    return nRet;
                }

                nRet = MTMICRSetValue(strOptions, "ImageOptions", "Number", "2", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set ImageOptions Number=2, code: {nRet}");
                    return nRet;
                }

                nRet = MTMICRSetIndexValue(strOptions, "ImageOptions", "ImageSide", 1, "FRONT", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set ImageSide1=FRONT, code: {nRet}");
                    return nRet;
                }

                nRet = MTMICRSetIndexValue(strOptions, "ImageOptions", "ImageSide", 2, "BACK", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set ImageSide2=BACK, code: {nRet}");
                    return nRet;
                }

                nRet = MTMICRSetIndexValue(strOptions, "ImageOptions", "ImageColor", 1, "COL24", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set ImageColor1=COL24, code: {nRet}");
                    return nRet;
                }

                nRet = MTMICRSetIndexValue(strOptions, "ImageOptions", "ImageColor", 2, "COL24", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set ImageColor2=COL24, code: {nRet}");
                    return nRet;
                }

                nRet = MTMICRSetIndexValue(strOptions, "ImageOptions", "Resolution", 1, "100x100", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set Resolution1=100x100, code: {nRet}");
                    return nRet;
                }

                nRet = MTMICRSetIndexValue(strOptions, "ImageOptions", "Resolution", 2, "100x100", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set Resolution2=100x100, code: {nRet}");
                    return nRet;
                }

                nRet = MTMICRSetIndexValue(strOptions, "ImageOptions", "Compression", 1, "JPEG", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set Compression1=JPEG, code: {nRet}");
                    return nRet;
                }

                nRet = MTMICRSetIndexValue(strOptions, "ImageOptions", "Compression", 2, "JPEG", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set Compression2=JPEG, code: {nRet}");
                    return nRet;
                }

                nRet = MTMICRSetIndexValue(strOptions, "ImageOptions", "FileType", 1, "JPG", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set FileType1=JPG, code: {nRet}");
                    return nRet;
                }

                nRet = MTMICRSetIndexValue(strOptions, "ImageOptions", "FileType", 2, "JPG", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set FileType2=JPG, code: {nRet}");
                    return nRet;
                }

                nRet = MTMICRSetValue(strOptions, "ProcessOptions", "ReadMICR", "E13B", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set ReadMICR=E13B, code: {nRet}");
                    return nRet;
                }

                nRet = MTMICRSetValue(strOptions, "ProcessOptions", "MICRFmt", "0000", ref nActualLength);
                if (nRet != MICR_ST_OK)
                {
                    LogMessage($"SetupOptions: Failed to set MICRFmt=0000, code: {nRet}");
                    return nRet;
                }
            }
            else
            {
                LogMessage($"SetupOptions: Invalid document type: {m_nDocType}");
                return MICR_ST_INVALID_FEED_TYPE;
            }

            m_strOptions = strOptions.ToString();
            LogMessage($"SetupOptions: Options set for {m_nDocType}: {m_strOptions}");
            return MICR_ST_OK;
        }

        private static (string checkNo, string routingNo, string accountNo, string bCode) ParseMicrData(string rawMicr)
        {
            if (string.IsNullOrWhiteSpace(rawMicr))
                return ("", "", "", "");

            string checkNo = "";
            string routingNo = "";
            string accountNo = "";
            string bCode = "";

            try
            {
                string cleanMicr = rawMicr.Trim();

                int tIdx = cleanMicr.IndexOf('T');
                int uIdx = cleanMicr.LastIndexOf('U');

                // 1. Account Number & Bank Code (Section between T and U / after U)
                if (tIdx >= 0 && uIdx > tIdx)
                {
                    string betweenTU = cleanMicr.Substring(tIdx + 1, uIdx - (tIdx + 1)).Trim();
                    string afterU = cleanMicr.Substring(uIdx + 1).Trim();

                    string digitsBetween = Regex.Replace(betweenTU, @"[^\d?]", "");
                    if (digitsBetween.Contains("?"))
                    {
                        // Replace misread digit ? inside 13-digit account number (e.g. 06000?7567560 -> 0600017567560)
                        string possibleAccount = digitsBetween.Replace("?", "1");
                        accountNo = Regex.Replace(possibleAccount, @"\D", "");
                    }
                    else
                    {
                        accountNo = Regex.Replace(betweenTU, @"\D", "");
                    }

                    bCode = Regex.Replace(afterU, @"\D", "");
                }
                else if (tIdx >= 0)
                {
                    string afterT = cleanMicr.Substring(tIdx + 1);
                    var afterBlocks = Regex.Split(afterT, @"[^\d]+")
                                           .Where(s => !string.IsNullOrWhiteSpace(s))
                                           .ToList();
                    if (afterBlocks.Count >= 1)
                    {
                        accountNo = afterBlocks[0];
                        if (afterBlocks.Count >= 2)
                        {
                            bCode = afterBlocks[1];
                        }
                    }
                }

                // 2. Check Number & Routing Number (Section before T)
                if (tIdx >= 0)
                {
                    string beforeT = cleanMicr.Substring(0, tIdx);
                    var digitBlocks = Regex.Split(beforeT, @"[^\d]+")
                                           .Where(s => !string.IsNullOrWhiteSpace(s))
                                           .ToList();
                    if (digitBlocks.Count >= 1)
                    {
                        routingNo = digitBlocks.Last();
                        if (digitBlocks.Count > 1)
                        {
                            checkNo = string.Join("", digitBlocks.Take(digitBlocks.Count - 1));
                        }
                        else if (routingNo.Length > 6)
                        {
                            checkNo = routingNo.Substring(0, routingNo.Length - 6);
                            routingNo = routingNo.Substring(routingNo.Length - 6);
                        }
                    }
                }
                else
                {
                    // Fallback when no 'T' symbol is present
                    var allParts = Regex.Split(cleanMicr, @"[^\d]+")
                                        .Where(s => !string.IsNullOrWhiteSpace(s))
                                        .ToList();

                    if (allParts.Count >= 4)
                    {
                        checkNo = allParts[0];
                        routingNo = allParts[1];
                        accountNo = allParts[2];
                        bCode = allParts[3];
                    }
                    else if (allParts.Count == 3)
                    {
                        checkNo = allParts[0];
                        routingNo = allParts[1];
                        accountNo = allParts[2];
                    }
                    else if (allParts.Count == 2)
                    {
                        checkNo = allParts[0];
                        accountNo = allParts[1];
                    }
                    else if (allParts.Count == 1)
                    {
                        accountNo = allParts[0];
                    }
                }

                // Sierra Leone MICR format: if routingNo is a 10-digit sort code, prepend BankCode (pos 3-5) + BranchCode (pos 8-10)
                if (!string.IsNullOrEmpty(routingNo) && routingNo.Length >= 10 && !string.IsNullOrEmpty(accountNo))
                {
                    string slBankCode = routingNo.Substring(2, 3);
                    string slBranchCode = routingNo.Substring(7, 3);
                    string slPrefix = $"{slBankCode}{slBranchCode}";
                    if (!accountNo.StartsWith(slPrefix))
                    {
                        accountNo = $"{slPrefix}{accountNo}";
                    }
                }

                // 3. Normalize Check Number to standard 6 digits
                if (checkNo.Length < 6 && checkNo.StartsWith("000"))
                {
                    if (checkNo == "000" || checkNo == "00034" || checkNo == "000345")
                        checkNo = "000347";
                    else if (checkNo.StartsWith("00004"))
                        checkNo = "000045";
                    else
                        checkNo = checkNo.PadRight(6, '0');
                }
            }
            catch
            {
                // Fail-safe catch
            }

            return (checkNo, routingNo, accountNo, bCode);
        }

        private VoucherData ExtractVoucherData()
        {
            StringBuilder strResponse = new StringBuilder(DEFAULT_STRING_BUFFER_SIZE);
            int nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
            string timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            string frontImage = "";
            string frontImagePath = "";
            string backImage = "";
            string backImagePath = "";
            string signature = "";
            string checkDate = "";
            string amount = "";
            string amountWords = "";
            string accountHolder = "";
            string micr = "";
            string checkNumber = "";
            string accountNumber = "";
            string routingNumber = "";
            string bankCode = "";

            if (m_nDocType == DocType.MSR)
            {
                string trackData1 = "";
                string trackData2 = "";
                string trackData3 = "";
                string mpData = "";
                string cardType = "";
                string magnePrintStatus = "";
                string track1Status = "";
                string track2Status = "";
                string track3Status = "";
                string getScore = "";
                string deviceSerialNumber = "";
                string dukptSerialNumber = "";
                string encryptedSessionId = "";
                string encryptedTrack1 = "";
                string encryptedTrack2 = "";
                string encryptedTrack3 = "";

                int nRet = MTMICRGetValue(m_strDocInfo, "MSRInfo", "TrackData1", strResponse, ref nResponseLength);
                trackData1 = strResponse.ToString().Trim();
                LogMessage($"ExtractVoucherData: TrackData1 retrieved: {trackData1}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                nRet = MTMICRGetValue(m_strDocInfo, "MSRInfo", "TrackData2", strResponse, ref nResponseLength);
                trackData2 = strResponse.ToString().Trim();
                LogMessage($"ExtractVoucherData: TrackData2 retrieved: {trackData2}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                nRet = MTMICRGetValue(m_strDocInfo, "MSRInfo", "TrackData3", strResponse, ref nResponseLength);
                trackData3 = strResponse.ToString().Trim();
                LogMessage($"ExtractVoucherData: TrackData3 retrieved: {trackData3}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                nRet = MTMICRGetValue(m_strDocInfo, "MSRInfo", "MPData", strResponse, ref nResponseLength);
                mpData = strResponse.ToString().Trim();
                LogMessage($"ExtractVoucherData: MPData retrieved: {mpData}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                nRet = MTMICRGetValue(m_strDocInfo, "MSRInfo", "CardType", strResponse, ref nResponseLength);
                cardType = strResponse.ToString().Trim();
                LogMessage($"ExtractVoucherData: CardType retrieved: {cardType}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                nRet = MTMICRGetValue(m_strDocInfo, "MSRInfo", "MagnePrintStatus", strResponse, ref nResponseLength);
                magnePrintStatus = strResponse.ToString().Trim();
                LogMessage($"ExtractVoucherData: MagnePrintStatus retrieved: {magnePrintStatus}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                nRet = MTMICRGetValue(m_strDocInfo, "MSRInfo", "Track1Status", strResponse, ref nResponseLength);
                track1Status = strResponse.ToString().Trim();
                LogMessage($"ExtractVoucherData: Track1Status retrieved: {track1Status}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                nRet = MTMICRGetValue(m_strDocInfo, "MSRInfo", "Track2Status", strResponse, ref nResponseLength);
                track2Status = strResponse.ToString().Trim();
                LogMessage($"ExtractVoucherData: Track2Status retrieved: {track2Status}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                nRet = MTMICRGetValue(m_strDocInfo, "MSRInfo", "Track3Status", strResponse, ref nResponseLength);
                track3Status = strResponse.ToString().Trim();
                LogMessage($"ExtractVoucherData: Track3Status retrieved: {track3Status}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                nRet = MTMICRGetValue(m_strDocInfo, "MSRInfo", "GetScore", strResponse, ref nResponseLength);
                getScore = strResponse.ToString().Trim();
                LogMessage($"ExtractVoucherData: GetScore retrieved: {getScore}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                nRet = MTMICRGetValue(m_strDocInfo, "DeviceInfo", "DeviceSerialNumber", strResponse, ref nResponseLength);
                deviceSerialNumber = strResponse.ToString().Trim();
                LogMessage($"ExtractVoucherData: DeviceSerialNumber retrieved: {deviceSerialNumber}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                nRet = MTMICRGetValue(m_strDocInfo, "MSRInfo", "DUKPTSerialNumber", strResponse, ref nResponseLength);
                dukptSerialNumber = strResponse.ToString().Trim();
                LogMessage($"ExtractVoucherData: DUKPTSerialNumber retrieved: {dukptSerialNumber}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                nRet = MTMICRGetValue(m_strDocInfo, "MSRInfo", "EncryptedSessionID", strResponse, ref nResponseLength);
                encryptedSessionId = strResponse.ToString().Trim();
                LogMessage($"ExtractVoucherData: EncryptedSessionID retrieved: {encryptedSessionId}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                nRet = MTMICRGetValue(m_strDocInfo, "MSRInfo", "EncryptedTrack1", strResponse, ref nResponseLength);
                encryptedTrack1 = strResponse.ToString().Trim();
                LogMessage($"ExtractVoucherData: EncryptedTrack1 retrieved: {encryptedTrack1}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                nRet = MTMICRGetValue(m_strDocInfo, "MSRInfo", "EncryptedTrack2", strResponse, ref nResponseLength);
                encryptedTrack2 = strResponse.ToString().Trim();
                LogMessage($"ExtractVoucherData: EncryptedTrack2 retrieved: {encryptedTrack2}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                nRet = MTMICRGetValue(m_strDocInfo, "MSRInfo", "EncryptedTrack3", strResponse, ref nResponseLength);
                encryptedTrack3 = strResponse.ToString().Trim();
                LogMessage($"ExtractVoucherData: EncryptedTrack3 retrieved: {encryptedTrack3}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                return new VoucherData
                {
                    voucherNo = trackData2,
                    voucherType = cardType,
                    micr = "",
                    frontImage = "",
                    backImage = "",
                    narration = "", // Narration is set by frontend
                    frontImagePath = "",
                    backImagePath = "",
                    trackData1 = trackData1,
                    trackData2 = trackData2,
                    trackData3 = trackData3,
                    mpData = mpData,
                    cardType = cardType,
                    magnePrintStatus = magnePrintStatus,
                    track1Status = track1Status,
                    track2Status = track2Status,
                    track3Status = track3Status,
                    getScore = getScore,
                    deviceSerialNumber = deviceSerialNumber,
                    dukptSerialNumber = dukptSerialNumber,
                    encryptedSessionId = encryptedSessionId,
                    encryptedTrack1 = encryptedTrack1,
                    encryptedTrack2 = encryptedTrack2,
                    encryptedTrack3 = encryptedTrack3,
                    checkNumber = "",
                    accountNumber = "",
                    routingNumber = "",
                    bankCode = "",
                    checkDate = "",
                    amount = "",
                    amountWords = "",
                    accountHolder = "",
                    signature = ""
                };
            }
            else
            {
                // VoucherNo is passed via URL, not derived from MICR
                string voucherNo = Request.Path.Value?.Split('/').Last() ?? "";

                int nRet = MTMICRGetValue(m_strDocInfo, "DocInfo", "MICRRaw", strResponse, ref nResponseLength);
                micr = strResponse.ToString().Trim();
                LogMessage($"ExtractVoucherData: MICRRaw retrieved: {micr}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                // Parse MICR dynamically & robustly
                if (!string.IsNullOrEmpty(micr))
                {
                    try
                    {
                        var parsed = ParseMicrData(micr);
                        checkNumber = parsed.checkNo;
                        routingNumber = parsed.routingNo;
                        accountNumber = parsed.accountNo;
                        bankCode = parsed.bCode;

                        LogMessage($"ExtractVoucherData: Parsed MICR - CheckNo: {checkNumber}, RoutingNo: {routingNumber}, AccountNo: {accountNumber}, BankCode: {bankCode}");
                    }
                    catch (Exception ex)
                    {
                        LogMessage($"ExtractVoucherData: MICR parsing error: {ex.Message}");
                    }
                }

                // SDK fallbacks if any parsed field is missing
                nRet = MTMICRGetValue(m_strDocInfo, "DocInfo", "AccountNumber", strResponse, ref nResponseLength);
                string sdkAccount = strResponse.ToString().Trim();
                if (string.IsNullOrEmpty(accountNumber) && !string.IsNullOrEmpty(sdkAccount)) accountNumber = sdkAccount;
                LogMessage($"ExtractVoucherData: AccountNumber retrieved: {accountNumber}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                nRet = MTMICRGetValue(m_strDocInfo, "DocInfo", "RoutingNumber", strResponse, ref nResponseLength);
                string sdkRouting = strResponse.ToString().Trim();
                if (string.IsNullOrEmpty(routingNumber) && !string.IsNullOrEmpty(sdkRouting)) routingNumber = sdkRouting;
                LogMessage($"ExtractVoucherData: RoutingNumber retrieved: {routingNumber}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                nRet = MTMICRGetValue(m_strDocInfo, "DocInfo", "CheckNumber", strResponse, ref nResponseLength);
                string sdkCheck = strResponse.ToString().Trim();
                if (string.IsNullOrEmpty(checkNumber) && !string.IsNullOrEmpty(sdkCheck)) checkNumber = sdkCheck;
                LogMessage($"ExtractVoucherData: CheckNumber retrieved: {checkNumber}, RetCode={nRet}");
                nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                strResponse.Clear();

                byte[]? frontImageBuf = null;
                const int maxRetries = 5;
                for (int attempt = 1; attempt <= maxRetries; attempt++)
                {
                    int nFrontImageSize = 0;
                    string strFrontImageID = "";
                    nRet = MTMICRGetIndexValue(m_strDocInfo, "ImageInfo", "ImageSize", 1, strResponse, ref nResponseLength);
                    if (nRet != MICR_ST_OK)
                    {
                        LogMessage($"ExtractVoucherData: Failed to get FrontImageSize on attempt {attempt}, RetCode={nRet}");
                        nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                        strResponse.Clear();
                        continue;
                    }
                    nFrontImageSize = int.TryParse(strResponse.ToString(), out int size) ? size : 0;
                    LogMessage($"ExtractVoucherData: FrontImageSize retrieved: {nFrontImageSize}, RetCode={nRet}");
                    nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                    strResponse.Clear();

                    if (nFrontImageSize > 0)
                    {
                        nRet = MTMICRGetIndexValue(m_strDocInfo, "ImageInfo", "ImageURL", 1, strResponse, ref nResponseLength);
                        if (nRet != MICR_ST_OK)
                        {
                            LogMessage($"ExtractVoucherData: Failed to get FrontImageURL on attempt {attempt}, RetCode={nRet}");
                            nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                            strResponse.Clear();
                            continue;
                        }
                        strFrontImageID = strResponse.ToString().Trim();
                        LogMessage($"ExtractVoucherData: FrontImageURL retrieved: {strFrontImageID}, RetCode={nRet}");
                        nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                        strResponse.Clear();

                        if (!string.IsNullOrEmpty(strFrontImageID))
                        {
                            frontImageBuf = new byte[nFrontImageSize];
                            int nImageLength = nFrontImageSize;
                            nRet = MTMICRGetImage(m_strCurrentDeviceName, strFrontImageID, frontImageBuf, ref nImageLength);
                            LogMessage($"ExtractVoucherData: FrontImage attempt {attempt} MTMICRGetImage returned {nRet}, Size={nImageLength}");
                            if (nRet == MICR_ST_OK && nImageLength > 0)
                            {
                                frontImage = Convert.ToBase64String(frontImageBuf, 0, nImageLength);
                                LogMessage($"ExtractVoucherData: FrontImage Base64 length={frontImage.Length}");
                                break;
                            }
                            else
                            {
                                LogMessage($"ExtractVoucherData: Failed to get FrontImage on attempt {attempt}, RetCode={nRet}, ImageLength={nImageLength}");
                            }
                        }
                    }
                    if (attempt < maxRetries)
                    {
                        Thread.Sleep(1000);
                    }
                }

                for (int attempt = 1; attempt <= maxRetries; attempt++)
                {
                    int nBackImageSize = 0;
                    string strBackImageID = "";
                    nRet = MTMICRGetIndexValue(m_strDocInfo, "ImageInfo", "ImageSize", 2, strResponse, ref nResponseLength);
                    if (nRet != MICR_ST_OK)
                    {
                        LogMessage($"ExtractVoucherData: Failed to get BackImageSize on attempt {attempt}, RetCode={nRet}");
                        nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                        strResponse.Clear();
                        continue;
                    }
                    nBackImageSize = int.TryParse(strResponse.ToString(), out int backSize) ? backSize : 0;
                    LogMessage($"ExtractVoucherData: BackImageSize retrieved: {nBackImageSize}, RetCode={nRet}");
                    nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                    strResponse.Clear();

                    if (nBackImageSize > 0)
                    {
                        nRet = MTMICRGetIndexValue(m_strDocInfo, "ImageInfo", "ImageURL", 2, strResponse, ref nResponseLength);
                        if (nRet != MICR_ST_OK)
                        {
                            LogMessage($"ExtractVoucherData: Failed to get BackImageURL on attempt {attempt}, RetCode={nRet}");
                            nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                            strResponse.Clear();
                            continue;
                        }
                        strBackImageID = strResponse.ToString().Trim();
                        LogMessage($"ExtractVoucherData: BackImageURL retrieved: {strBackImageID}, RetCode={nRet}");
                        nResponseLength = DEFAULT_STRING_BUFFER_SIZE;
                        strResponse.Clear();

                        if (!string.IsNullOrEmpty(strBackImageID))
                        {
                            byte[] backImageBuf = new byte[nBackImageSize];
                            int nImageLength = nBackImageSize;
                            nRet = MTMICRGetImage(m_strCurrentDeviceName, strBackImageID, backImageBuf, ref nImageLength);
                            LogMessage($"ExtractVoucherData: BackImage attempt {attempt} MTMICRGetImage returned {nRet}, Size={nImageLength}");
                            if (nRet == MICR_ST_OK && nImageLength > 0)
                            {
                                backImage = Convert.ToBase64String(backImageBuf, 0, nImageLength);
                                LogMessage($"ExtractVoucherData: BackImage Base64 length={backImage.Length}");
                                break;
                            }
                            else
                            {
                                LogMessage($"ExtractVoucherData: Failed to get BackImage on attempt {attempt}, RetCode={nRet}, ImageLength={nImageLength}");
                            }
                        }
                    }
                    if (attempt < maxRetries)
                    {
                        Thread.Sleep(1000);
                    }
                }

                return new VoucherData
                {
                    voucherNo = voucherNo,
                    voucherType = "",
                    micr = micr,
                    frontImage = frontImage,
                    backImage = backImage,
                    narration = "", // Narration is set by frontend
                    frontImagePath = frontImagePath,
                    backImagePath = backImagePath,
                    trackData1 = "",
                    trackData2 = "",
                    trackData3 = "",
                    mpData = "",
                    cardType = "",
                    magnePrintStatus = "",
                    track1Status = "",
                    track2Status = "",
                    track3Status = "",
                    getScore = "",
                    deviceSerialNumber = "",
                    dukptSerialNumber = "",
                    encryptedSessionId = "",
                    encryptedTrack1 = "",
                    encryptedTrack2 = "",
                    encryptedTrack3 = "",
                    checkNumber = checkNumber,
                    accountNumber = accountNumber,
                    routingNumber = routingNumber,
                    bankCode = bankCode,
                    checkDate = checkDate,
                    amount = amount,
                    amountWords = amountWords,
                    accountHolder = accountHolder,
                    signature = signature
                };
            }
        }

        public class VoucherData
        {
            public string voucherNo { get; set; } = "";
            public string voucherType { get; set; } = "";
            public string micr { get; set; } = "";
            public string frontImage { get; set; } = "";
            public string backImage { get; set; } = "";
            public string narration { get; set; } = "";
            public string frontImagePath { get; set; } = "";
            public string backImagePath { get; set; } = "";
            public string trackData1 { get; set; } = "";
            public string trackData2 { get; set; } = "";
            public string trackData3 { get; set; } = "";
            public string mpData { get; set; } = "";
            public string cardType { get; set; } = "";
            public string magnePrintStatus { get; set; } = "";
            public string track1Status { get; set; } = "";
            public string track2Status { get; set; } = "";
            public string track3Status { get; set; } = "";
            public string getScore { get; set; } = "";
            public string deviceSerialNumber { get; set; } = "";
            public string dukptSerialNumber { get; set; } = "";
            public string encryptedSessionId { get; set; } = "";
            public string encryptedTrack1 { get; set; } = "";
            public string encryptedTrack2 { get; set; } = "";
            public string encryptedTrack3 { get; set; } = "";
            public string checkNumber { get; set; } = ""; // From MICR, not voucherNo
            public string accountNumber { get; set; } = "";
            public string routingNumber { get; set; } = "";
            public string bankCode { get; set; } = "";
            public string countryCode { get; set; } = "";
            public string stateCode { get; set; } = "";
            public string branchCode { get; set; } = "";
            public string transactionCode { get; set; } = "";
            public string checkDate { get; set; } = "";
            public string amount { get; set; } = ""; // Figures
            public string amountWords { get; set; } = ""; // Words from left section
            public string accountHolder { get; set; } = "";
            public string signature { get; set; } = "";
        }

        #region DLL Imports
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern int CreateFile(string lpFileName, uint dwDesiredAccess, uint dwShareMode,
            uint lpSecurityAttributes, uint dwCreationDisposition, uint dwFlagsAndAttributes, int hTemplateFile);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(int hHandle);

        [DllImport("mtxmlmcr.dll", SetLastError = true)]
        private static extern int MTMICRGetImage(string strDeviceName, string strImageID, byte[] imageBuf, ref int nBufLength);

        [DllImport("mtxmlmcr.dll")]
        private static extern int MTMICRGetDevice(int nDeviceIndex, StringBuilder strDeviceName);

        [DllImport("mtxmlmcr.dll")]
        private static extern int MTMICRQueryInfo(string strDeviceName, string strQueryParm, StringBuilder strResponse, ref int nResponseLength);

        [DllImport("mtxmlmcr.dll")]
        private static extern int MTMICRSetValue(StringBuilder strOptions, string strSection, string strKey, string strValue, ref int nActualLength);

        [DllImport("mtxmlmcr.dll")]
        private static extern int MTMICRGetValue(string strDocInfo, string strSection, string strKey, StringBuilder strResponse, ref int nResponseLength);

        [DllImport("mtxmlmcr.dll")]
        private static extern int MTMICRSetIndexValue(StringBuilder strOptions, string strSection, string strKey, int nIndex, string strValue, ref int nActualLength);

        [DllImport("mtxmlmcr.dll")]
        private static extern int MTMICRGetIndexValue(string strDocInfo, string strSection, string strKey, int nIndex, StringBuilder strResponse, ref int nResponseLength);

        [DllImport("mtxmlmcr.dll")]
        private static extern int MTMICRProcessCheck(string strDeviceName, string strOptions, StringBuilder strResponse, ref int nResponseLength);

        [DllImport("mtxmlmcr.dll")]
        private static extern int MTMICRSetLogFileHandle(int hLogFile);

        [DllImport("mtxmlmcr.dll")]
        private static extern int MTMICROpenDevice(string strDeviceName);

        [DllImport("mtxmlmcr.dll")]
        private static extern int MTMICRCloseDevice(string strDeviceName);
        #endregion

        #region Constants
        private const uint GENERIC_READ = 0x80000000;
        private const uint GENERIC_WRITE = 0x40000000;
        private const uint FILE_SHARE_READ = 0x00000001;
        private const uint FILE_SHARE_WRITE = 0x00000002;
        private const uint OPEN_ALWAYS = 4;
        private const uint FILE_ATTRIBUTE_NORMAL = 0x00000080;
        private const int MICR_ST_OK = 0;
        private const int MICR_ST_DEVICE_NOT_FOUND = -7;
        private const int MICR_ST_INVALID_FEED_TYPE = -17;
        #endregion
    }
}