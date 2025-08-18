
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Win32;

/// <summary>
/// Classe per la registrazione automatica software presso QLM Register
/// </summary>
public class QLMRegistration
{
    private readonly string _apiBaseUrl;
    private readonly string _nomeAzienda;
    private readonly string _partitaIva;
    private readonly string _nomeSoftware;
    private readonly string _versione;
    private readonly string _installationPath;
    private readonly HttpClient _httpClient;

    public QLMRegistration(string apiBaseUrl, string nomeAzienda, string partitaIva, 
                          string nomeSoftware, string versione, string installationPath)
    {
        _apiBaseUrl = apiBaseUrl;
        _nomeAzienda = nomeAzienda;
        _partitaIva = partitaIva;
        _nomeSoftware = nomeSoftware;
        _versione = versione;
        _installationPath = installationPath;
        _httpClient = new HttpClient();
    }

    /// <summary>
    /// Genera una chiave univoca per il dispositivo
    /// </summary>
    private string GenerateComputerKey()
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var random = Guid.NewGuid().ToString("N")[..9].ToUpper();
        var machineId = GetMachineIdentifier();
        return $"{_nomeSoftware.Replace(" ", "")}-{machineId}-{random}";
    }

    /// <summary>
    /// Ottiene l'identificativo della macchina Windows
    /// </summary>
    private string GetMachineIdentifier()
    {
        try
        {
            // Usa il Machine GUID di Windows
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Cryptography");
            var machineGuid = key?.GetValue("MachineGuid")?.ToString();
            return machineGuid?[..8] ?? "UNKNOWN";
        }
        catch
        {
            return Environment.MachineName[..Math.Min(8, Environment.MachineName.Length)];
        }
    }

    /// <summary>
    /// Ottiene informazioni sul sistema
    /// </summary>
    private string GetMachineInfo()
    {
        return $"{Environment.OSVersion} - {Environment.MachineName}";
    }

    /// <summary>
    /// Registra il software presso QLM
    /// </summary>
    public async Task<RegistrationResult> RegisterSoftwareAsync()
    {
        var computerKey = GenerateComputerKey();
        
        var payload = new
        {
            nomeAzienda = _nomeAzienda,
            partitaIva = _partitaIva,
            nomeSoftware = _nomeSoftware,
            versione = _versione,
            computerKey = computerKey,
            installationPath = _installationPath,
            machineInfo = GetMachineInfo(),
            registrationDate = DateTime.UtcNow.ToString("O")
        };

        try
        {
            Console.WriteLine($"🔄 Registrando {_nomeSoftware} presso QLM...");

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            _httpClient.DefaultRequestHeaders.Add("User-Agent", $"{_nomeSoftware}-Registration/1.0");

            var response = await _httpClient.PostAsync($"{_apiBaseUrl}/api/software/register", content);

            if (response.IsSuccessStatusCode)
            {
                var responseText = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<QLMResponse>(responseText);
                
                Console.WriteLine("✅ Registrazione QLM completata!");
                
                // Salva la computer key nel registry
                SaveComputerKey(computerKey);
                
                return new RegistrationResult
                {
                    Success = true,
                    ComputerKey = computerKey,
                    Response = result
                };
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"❌ Errore registrazione QLM: {response.StatusCode} - {error}");
                
                return new RegistrationResult
                {
                    Success = false,
                    Error = $"HTTP {(int)response.StatusCode}: {error}"
                };
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"🚨 Errore durante registrazione QLM: {ex.Message}");
            
            return new RegistrationResult
            {
                Success = false,
                Error = ex.Message
            };
        }
    }

    /// <summary>
    /// Salva la computer key nel registry Windows
    /// </summary>
    private void SaveComputerKey(string computerKey)
    {
        try
        {
            using var key = Registry.CurrentUser.CreateSubKey($@"SOFTWARE\{_nomeSoftware}\QLM");
            key.SetValue("ComputerKey", computerKey);
            Console.WriteLine("💾 Computer key salvata nel registry");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ Impossibile salvare computer key: {ex.Message}");
        }
    }

    /// <summary>
    /// Carica la computer key dal registry
    /// </summary>
    private string LoadComputerKey()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey($@"SOFTWARE\{_nomeSoftware}\QLM");
            return key?.GetValue("ComputerKey")?.ToString();
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Valida la licenza presso il server QLM
    /// </summary>
    public async Task<ValidationResult> ValidateLicenseAsync()
    {
        var computerKey = LoadComputerKey();
        if (string.IsNullOrEmpty(computerKey))
        {
            Console.WriteLine("⚠️ Computer key non trovata, registrazione necessaria");
            return new ValidationResult
            {
                Success = false,
                DeviceAuthorized = false,
                NeedsRegistration = true,
                Message = "Computer key non trovata"
            };
        }

        var payload = new
        {
            partitaIva = _partitaIva,
            nomeSoftware = _nomeSoftware,
            computerKey = computerKey,
            machineInfo = GetMachineInfo()
        };

        try
        {
            Console.WriteLine($"🔍 Validazione licenza per computer key: {computerKey}");

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", $"{_nomeSoftware}-Validation/1.0");

            var response = await _httpClient.PostAsync($"{_apiBaseUrl}/api/software/validate", content);

            if (response.IsSuccessStatusCode)
            {
                var responseText = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<QLMValidationResponse>(responseText);
                
                if (result.success && result.deviceAuthorized)
                {
                    Console.WriteLine($"✅ Licenza valida: {result.message}");
                    
                    return new ValidationResult
                    {
                        Success = true,
                        DeviceAuthorized = true,
                        ValidityDays = result.licenseValidityDays,
                        LicenseType = result.licenseType,
                        MaxDevices = result.maxDevices,
                        MaxUsers = result.maxUsers,
                        Message = result.message
                    };
                }
                else
                {
                    Console.WriteLine($"❌ Licenza non valida: {result.message}");
                    
                    return new ValidationResult
                    {
                        Success = false,
                        DeviceAuthorized = false,
                        Message = result.message
                    };
                }
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"❌ Errore validazione: {response.StatusCode} - {error}");
                
                return new ValidationResult
                {
                    Success = false,
                    DeviceAuthorized = false,
                    Message = $"HTTP {(int)response.StatusCode}: {error}"
                };
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"🚨 Errore durante validazione licenza: {ex.Message}");
            
            return new ValidationResult
            {
                Success = false,
                DeviceAuthorized = false,
                Message = ex.Message
            };
        }
    }

    public void Dispose()
    {
        _httpClient?.Dispose();
    }
}

/// <summary>
/// Risultato della registrazione
/// </summary>
public class RegistrationResult
{
    public bool Success { get; set; }
    public string ComputerKey { get; set; }
    public string Error { get; set; }
    public QLMResponse Response { get; set; }
}

/// <summary>
/// Risposta dalla API QLM
/// </summary>
public class QLMResponse
{
    public bool success { get; set; }
    public string message { get; set; }
    public bool deviceAuthorized { get; set; }
    public int licenseValidityDays { get; set; }
}

/// <summary>
/// Risposta dalla API di validazione QLM
/// </summary>
public class QLMValidationResponse
{
    public bool success { get; set; }
    public string message { get; set; }
    public bool deviceAuthorized { get; set; }
    public int licenseValidityDays { get; set; }
    public string licenseType { get; set; }
    public int maxDevices { get; set; }
    public int maxUsers { get; set; }
    public string activationKey { get; set; }
}

/// <summary>
/// Risultato della validazione licenza
/// </summary>
public class ValidationResult
{
    public bool Success { get; set; }
    public bool DeviceAuthorized { get; set; }
    public bool NeedsRegistration { get; set; }
    public int ValidityDays { get; set; }
    public string LicenseType { get; set; }
    public int MaxDevices { get; set; }
    public int MaxUsers { get; set; }
    public string Message { get; set; }
}

// Esempio di utilizzo
class Program
{
    static async Task Main(string[] args)
    {
        var qlm = new QLMRegistration(
            apiBaseUrl: "https://your-qlm-platform.replit.app",
            nomeAzienda: "Esempio SRL",
            partitaIva: "12345678901",
            nomeSoftware: "MioSoftware Pro",
            versione: "2.1.0",
            installationPath: @"C:\Program Files\MioSoftware\"
        );

        // Prima registrazione (se non già fatto)
        var registrationResult = await qlm.RegisterSoftwareAsync();
        
        if (registrationResult.Success)
        {
            Console.WriteLine($"🎉 Registrazione completata! Computer Key: {registrationResult.ComputerKey}");
        }

        // Poi validazione licenza (da fare periodicamente)
        var validationResult = await qlm.ValidateLicenseAsync();
        
        if (validationResult.Success && validationResult.DeviceAuthorized)
        {
            Console.WriteLine($"✅ Licenza valida! Giorni rimanenti: {validationResult.ValidityDays}");
            Console.WriteLine($"📋 Tipo licenza: {validationResult.LicenseType}");
            Console.WriteLine($"🔧 Max dispositivi: {validationResult.MaxDevices}, Max utenti: {validationResult.MaxUsers}");
        }
        else
        {
            Console.WriteLine($"❌ Licenza non valida: {validationResult.Message}");
            
            if (validationResult.NeedsRegistration)
            {
                Console.WriteLine("🔄 Registrazione necessaria");
            }
        }

        qlm.Dispose();
    }
}
