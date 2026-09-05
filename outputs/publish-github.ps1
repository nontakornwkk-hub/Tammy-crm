$ErrorActionPreference = 'Stop'
try {
    Set-Location -LiteralPath 'C:\Users\lenovo\Documents\Codex\2026-09-05\vs-code-x20'
    $gitExe = 'C:\Program Files\Git\cmd\git.exe'
    function Invoke-ProjectGit {
        & $gitExe @args
        if ($LASTEXITCODE -ne 0) { throw 'Git failed. Please send a screenshot of this window.' }
    }
    Invoke-ProjectGit config user.name 'nontakornwkk-hub'
    Invoke-ProjectGit config user.email 'nontakornwkk-hub@users.noreply.github.com'
    Invoke-ProjectGit add .
    & $gitExe diff --cached --quiet
    if ($LASTEXITCODE -eq 1) { Invoke-ProjectGit commit -m 'Initial Tammy CRM system' }
    elseif ($LASTEXITCODE -ne 0) { throw 'Unable to inspect staged files.' }
    $remotes = & $gitExe remote
    if ($remotes -contains 'origin') {
        Invoke-ProjectGit remote set-url origin 'https://github.com/nontakornwkk-hub/Tammy-crm.git'
    } else {
        Invoke-ProjectGit remote add origin 'https://github.com/nontakornwkk-hub/Tammy-crm.git'
    }
    Invoke-ProjectGit push -u origin HEAD:main
    Write-Host 'Upload completed: https://github.com/nontakornwkk-hub/Tammy-crm' -ForegroundColor Green
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
}
Read-Host 'Press Enter to close'
