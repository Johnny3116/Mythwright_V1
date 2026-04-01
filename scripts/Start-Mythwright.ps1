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

# Write a header to the log (UTF-8, no BOM)
$header = @(
    "[$Timestamp] Mythwright server starting...",
    "Project root : $ProjectRoot",
    "Log file     : $LogFile",
    ""
)
[System.IO.File]::WriteAllLines($LogFile, $header, [System.Text.UTF8Encoding]::new($false))

# Use cmd.exe so npm/vite .cmd wrappers resolve correctly on Windows.
# Redirect all output (stdout + stderr) to the log file via cmd redirection.
$psi                = [System.Diagnostics.ProcessStartInfo]::new()
$psi.FileName       = "cmd.exe"
$psi.Arguments      = "/c `"cd /d `"$ProjectRoot`" && npm run dev`" >> `"$LogFile`" 2>&1"
$psi.WindowStyle    = [System.Diagnostics.ProcessWindowStyle]::Hidden
$psi.CreateNoWindow = $true

[System.Diagnostics.Process]::Start($psi) | Out-Null

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
    [System.IO.File]::AppendAllText($LogFile, "$msg`n", [System.Text.UTF8Encoding]::new($false))
} else {
    $msg = "[$(Get-Date -Format 'HH:mm:ss')] Server ready after ${elapsed}s. Opening $Url"
    [System.IO.File]::AppendAllText($LogFile, "$msg`n", [System.Text.UTF8Encoding]::new($false))
}

Start-Process $Url
