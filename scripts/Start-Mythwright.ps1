# Start-Mythwright.ps1
# Starts the Mythwright dev server silently and opens the game in the default browser.
# Server stdout/stderr is captured to a timestamped log file.

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Port        = 5173
$Url         = "http://localhost:$Port"
$LogDir      = Join-Path $PSScriptRoot "server logs"
$Timestamp   = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$LogFile     = Join-Path $LogDir "server_$Timestamp.log"

# Ensure log directory exists
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

# Write a header to the log
"[$Timestamp] Mythwright server starting..." | Out-File -FilePath $LogFile -Encoding utf8
"Project root : $ProjectRoot"               | Out-File -FilePath $LogFile -Append -Encoding utf8
"Log file     : $LogFile"                   | Out-File -FilePath $LogFile -Append -Encoding utf8
""                                          | Out-File -FilePath $LogFile -Append -Encoding utf8

# Launch Vite in a hidden window, piping all output to the log file
$psi                       = [System.Diagnostics.ProcessStartInfo]::new()
$psi.FileName              = "powershell.exe"
$psi.Arguments             = "-NoProfile -Command `"Set-Location '$ProjectRoot'; npm run dev *>&1 | Tee-Object -FilePath '$LogFile' -Append`""
$psi.WindowStyle           = [System.Diagnostics.ProcessWindowStyle]::Hidden
$psi.CreateNoWindow        = $true

$serverProcess = [System.Diagnostics.Process]::Start($psi)

# Wait until the server is accepting connections (up to 30 seconds)
$timeout = 30
$elapsed = 0

while ($elapsed -lt $timeout) {
    try {
        $tcp = [System.Net.Sockets.TcpClient]::new("localhost", $Port)
        $tcp.Close()
        break
    } catch {
        Start-Sleep -Seconds 1
        $elapsed++
    }
}

if ($elapsed -ge $timeout) {
    $msg = "[$(Get-Date -Format 'HH:mm:ss')] ERROR: Server did not respond on port $Port within $timeout seconds."
    $msg | Out-File -FilePath $LogFile -Append -Encoding utf8
    # Open browser anyway — Vite may still be initialising
} else {
    "[$(Get-Date -Format 'HH:mm:ss')] Server ready after ${elapsed}s. Opening $Url" |
        Out-File -FilePath $LogFile -Append -Encoding utf8
}

Start-Process $Url
