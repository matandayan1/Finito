param([switch]$NoBrowser,[switch]$Restart)
$ErrorActionPreference = 'Stop'
$appRoot = $PSScriptRoot
$port = 8765
$previewUrl = "http://127.0.0.1:$port"
if($Restart){
    $pidFile=Join-Path $appRoot 'private/runtime/server.pid'
    if(Test-Path -LiteralPath $pidFile){
        $serverProcessId=[int](Get-Content -LiteralPath $pidFile -Raw).Trim()
        $serverProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$serverProcessId" -ErrorAction SilentlyContinue
        $expectedServer=(Join-Path $appRoot 'server.py')
        if($serverProcess){
            if($serverProcess.Name -ne 'python.exe' -or $serverProcess.CommandLine.IndexOf($expectedServer,[StringComparison]::OrdinalIgnoreCase) -lt 0){throw 'The recorded process is not this local server. It was not stopped.'}
            Stop-Process -Id $serverProcessId -ErrorAction Stop
            Start-Sleep -Milliseconds 300
        }
    }
}
$pythonCandidates = @(
    (Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs/Python/Python312/python.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs/Python/Python313/python.exe')
)
$pythonPath = $pythonCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $pythonPath) {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCommand) { $pythonPath = $pythonCommand.Source }
}
if (-not $pythonPath) { throw 'Python 3.11 or newer is required. See README.md.' }
$healthy = $false
try { $health = Invoke-RestMethod -Uri "$previewUrl/api/health" -TimeoutSec 2 -NoProxy; $healthy = $health.ok -eq $true -and $health.mode -eq 'local-review' } catch { }
if (-not $healthy) {
    $runtimeRoot = Join-Path $appRoot 'private/runtime'
    New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
    $serverPath = Join-Path $appRoot 'server.py'
    $arguments = @('-u', ('"{0}"' -f $serverPath), '--port', "$port")
    $process = Start-Process -FilePath $pythonPath -ArgumentList $arguments -WorkingDirectory $appRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeRoot 'server.log') -RedirectStandardError (Join-Path $runtimeRoot 'server-error.log')
    for ($attempt = 0; $attempt -lt 12; $attempt++) {
        Start-Sleep -Milliseconds 300
        if ($process.HasExited) { throw 'The server stopped. See private/runtime/server-error.log.' }
        try { $health = Invoke-RestMethod -Uri "$previewUrl/api/health" -TimeoutSec 1 -NoProxy; if ($health.ok -and $health.mode -eq 'local-review') { $healthy=$true; break } } catch { }
    }
    if (-not $healthy) { throw 'Could not connect to the local server. See private/runtime/server-error.log.' }
    Set-Content -LiteralPath (Join-Path $runtimeRoot 'server.pid') -Value $process.Id
}
if (-not $NoBrowser) { Start-Process $previewUrl }
Write-Output "Workspace ready: $previewUrl"
