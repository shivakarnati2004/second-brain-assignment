$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$baseUrl = 'http://127.0.0.1:3000'
$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param(
    [string]$Name,
    [string]$Status,
    [int]$Code,
    [string]$Info
  )
  $results.Add([pscustomobject]@{ Step = $Name; Status = $Status; Code = $Code; Info = $Info }) | Out-Null
}

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Url,
    [object]$Body,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session
  )

  $params = @{
    Method = $Method
    Uri = $Url
    WebSession = $Session
    Headers = @{ 'Content-Type' = 'application/json' }
    UseBasicParsing = $true
  }

  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 8)
  }

  try {
    $res = Invoke-WebRequest @params
    return [pscustomobject]@{
      Ok = $true
      StatusCode = [int]$res.StatusCode
      Body = if ($res.Content) { $res.Content | ConvertFrom-Json } else { $null }
    }
  } catch {
    if ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $raw = $reader.ReadToEnd()
      $body = $null
      try { $body = $raw | ConvertFrom-Json } catch {}
      return [pscustomobject]@{
        Ok = $false
        StatusCode = [int]$_.Exception.Response.StatusCode
        Body = $body
      }
    }
    throw
  }
}

function Invoke-MultipartUpload {
  param(
    [string]$Url,
    [string]$FilePath,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session
  )

  $boundary = [System.Guid]::NewGuid().ToString()
  $lineBreak = "`r`n"
  $fileName = [System.IO.Path]::GetFileName($FilePath)
  $fileBytes = [System.IO.File]::ReadAllBytes($FilePath)

  $header = "--$boundary$lineBreak" +
            "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"$lineBreak" +
            "Content-Type: application/octet-stream$lineBreak$lineBreak"
  $footer = "$lineBreak--$boundary--$lineBreak"

  $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
  $footerBytes = [System.Text.Encoding]::UTF8.GetBytes($footer)
  $bodyBytes = New-Object byte[] ($headerBytes.Length + $fileBytes.Length + $footerBytes.Length)

  [System.Array]::Copy($headerBytes, 0, $bodyBytes, 0, $headerBytes.Length)
  [System.Array]::Copy($fileBytes, 0, $bodyBytes, $headerBytes.Length, $fileBytes.Length)
  [System.Array]::Copy($footerBytes, 0, $bodyBytes, $headerBytes.Length + $fileBytes.Length, $footerBytes.Length)

  try {
    $response = Invoke-WebRequest -Uri $Url -Method POST -WebSession $Session -ContentType "multipart/form-data; boundary=$boundary" -Body $bodyBytes -UseBasicParsing
    return [pscustomobject]@{ StatusCode = [int]$response.StatusCode; Content = $response.Content }
  } catch {
    if ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $raw = $reader.ReadToEnd()
      return [pscustomobject]@{ StatusCode = [int]$_.Exception.Response.StatusCode; Content = $raw }
    }
    throw
  }
}

$serverProcess = $null
try {
  $conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
  if (-not $conn) {
    $serverProcess = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'dev' -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 10
  }

  try {
    $health = Invoke-WebRequest -Uri $baseUrl -UseBasicParsing -TimeoutSec 15
    Add-Result -Name 'Server health' -Status 'PASS' -Code ([int]$health.StatusCode) -Info 'App reachable'
  } catch {
    Add-Result -Name 'Server health' -Status 'FAIL' -Code 0 -Info 'Could not reach app on :3000'
    throw 'Server not reachable'
  }

  $anon = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $auth = New-Object Microsoft.PowerShell.Commands.WebRequestSession

  $email = "smoke+$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
  $password = 'SmokeTest123!'
  $name = 'Smoke User'

  $unauthStats = Invoke-Json -Method 'GET' -Url "$baseUrl/api/stats" -Body $null -Session $anon
  if ($unauthStats.StatusCode -eq 401) {
    Add-Result -Name 'Stats unauthorized' -Status 'PASS' -Code 401 -Info 'Unauth blocked'
  } else {
    Add-Result -Name 'Stats unauthorized' -Status 'FAIL' -Code $unauthStats.StatusCode -Info 'Expected 401'
  }

  $register = Invoke-Json -Method 'POST' -Url "$baseUrl/api/auth/register" -Body @{ email = $email; password = $password; name = $name } -Session $auth
  if ($register.StatusCode -in 200,201) {
    Add-Result -Name 'Register' -Status 'PASS' -Code $register.StatusCode -Info $email
  } else {
    Add-Result -Name 'Register' -Status 'FAIL' -Code $register.StatusCode -Info 'Register failed'
  }

  $me = Invoke-Json -Method 'GET' -Url "$baseUrl/api/auth/me" -Body $null -Session $auth
  if ($me.StatusCode -eq 200 -and $me.Body.data.email -eq $email) {
    Add-Result -Name 'Auth me' -Status 'PASS' -Code 200 -Info 'Authenticated user returned'
  } else {
    Add-Result -Name 'Auth me' -Status 'FAIL' -Code $me.StatusCode -Info 'Unexpected me response'
  }

  $authStats = Invoke-Json -Method 'GET' -Url "$baseUrl/api/stats" -Body $null -Session $auth
  if ($authStats.StatusCode -eq 200) {
    Add-Result -Name 'Stats authorized' -Status 'PASS' -Code 200 -Info 'Authorized stats returned'
  } else {
    Add-Result -Name 'Stats authorized' -Status 'FAIL' -Code $authStats.StatusCode -Info 'Expected 200'
  }

  $itemBody = @{
    title = 'Smoke Semantic Note'
    content = 'Vector search smoke content about embeddings, accessibility, keyboard shortcuts, and graph links.'
    type = 'note'
    tags = @('smoke','vector','graph')
    metadata = @{ source_name = 'smoke-script'; custom = @{ scenario = 'api' } }
  }
  $createItem = Invoke-Json -Method 'POST' -Url "$baseUrl/api/knowledge" -Body $itemBody -Session $auth
  if ($createItem.StatusCode -in 200,201) {
    Add-Result -Name 'Create knowledge' -Status 'PASS' -Code $createItem.StatusCode -Info ($createItem.Body.data.id)
  } else {
    Add-Result -Name 'Create knowledge' -Status 'FAIL' -Code $createItem.StatusCode -Info 'Create item failed'
  }

  Start-Sleep -Seconds 2

  $listItems = Invoke-Json -Method 'GET' -Url "$baseUrl/api/knowledge?search=semantic" -Body $null -Session $auth
  if ($listItems.StatusCode -eq 200 -and $listItems.Body.data.Count -ge 1) {
    Add-Result -Name 'List knowledge' -Status 'PASS' -Code 200 -Info "Count=$($listItems.Body.data.Count)"
  } else {
    Add-Result -Name 'List knowledge' -Status 'FAIL' -Code $listItems.StatusCode -Info 'No items in list'
  }

  $queryRes = Invoke-Json -Method 'POST' -Url "$baseUrl/api/query" -Body @{ query = 'What do I know about vector search and keyboard shortcuts?' } -Session $auth
  if ($queryRes.StatusCode -eq 200) {
    Add-Result -Name 'Brain query' -Status 'PASS' -Code 200 -Info 'Query returned answer'
  } else {
    Add-Result -Name 'Brain query' -Status 'FAIL' -Code $queryRes.StatusCode -Info 'Query failed'
  }

  $chatRes = Invoke-Json -Method 'POST' -Url "$baseUrl/api/chat" -Body @{ message = 'Summarize my smoke note briefly' } -Session $auth
  if ($chatRes.StatusCode -ne 200) {
    Start-Sleep -Seconds 2
    $chatRes = Invoke-Json -Method 'POST' -Url "$baseUrl/api/chat" -Body @{ message = 'Summarize my smoke note briefly' } -Session $auth
  }
  if ($chatRes.StatusCode -eq 200) {
    Add-Result -Name 'Chat' -Status 'PASS' -Code 200 -Info 'Chat returned reply'
  } else {
    Add-Result -Name 'Chat' -Status 'FAIL' -Code $chatRes.StatusCode -Info 'Chat failed'
  }

  $graphRes = Invoke-Json -Method 'GET' -Url "$baseUrl/api/graph" -Body $null -Session $auth
  if ($graphRes.StatusCode -eq 200) {
    $nodeCount = @($graphRes.Body.data.nodes).Count
    Add-Result -Name 'Graph API' -Status 'PASS' -Code 200 -Info "Nodes=$nodeCount"
  } else {
    Add-Result -Name 'Graph API' -Status 'FAIL' -Code $graphRes.StatusCode -Info 'Graph failed'
  }

  $txtPath = Join-Path $root 'smoke-upload.txt'
  $mdPath = Join-Path $root 'smoke-upload.md'
  Set-Content -Path $txtPath -Value 'Smoke upload text file about semantic search and graph relationships.' -Encoding UTF8
  Set-Content -Path $mdPath -Value '# Smoke Upload`nThis markdown covers accessibility and command palette shortcuts.' -Encoding UTF8

  try {
    $uploadTxt = Invoke-MultipartUpload -Url "$baseUrl/api/upload" -FilePath $txtPath -Session $auth
    if ($uploadTxt.StatusCode -eq 200) {
      Add-Result -Name 'Upload TXT' -Status 'PASS' -Code 200 -Info 'TXT extraction ok'
    } else {
      Add-Result -Name 'Upload TXT' -Status 'FAIL' -Code $uploadTxt.StatusCode -Info $uploadTxt.Content
    }
  } catch {
    Add-Result -Name 'Upload TXT' -Status 'FAIL' -Code 0 -Info $_.Exception.Message
  }

  try {
    $uploadMd = Invoke-MultipartUpload -Url "$baseUrl/api/upload" -FilePath $mdPath -Session $auth
    if ($uploadMd.StatusCode -eq 200) {
      Add-Result -Name 'Upload MD' -Status 'PASS' -Code 200 -Info 'MD extraction ok'
    } else {
      Add-Result -Name 'Upload MD' -Status 'FAIL' -Code $uploadMd.StatusCode -Info $uploadMd.Content
    }
  } catch {
    Add-Result -Name 'Upload MD' -Status 'FAIL' -Code 0 -Info $_.Exception.Message
  }

  $logout = Invoke-Json -Method 'POST' -Url "$baseUrl/api/auth/logout" -Body @{} -Session $auth
  if ($logout.StatusCode -eq 200) {
    Add-Result -Name 'Logout' -Status 'PASS' -Code 200 -Info 'Logged out'
  } else {
    Add-Result -Name 'Logout' -Status 'FAIL' -Code $logout.StatusCode -Info 'Logout failed'
  }

  $meAfterLogout = Invoke-Json -Method 'GET' -Url "$baseUrl/api/auth/me" -Body $null -Session $auth
  if ($meAfterLogout.StatusCode -eq 401) {
    Add-Result -Name 'Me after logout' -Status 'PASS' -Code 401 -Info 'Session invalidated'
  } else {
    Add-Result -Name 'Me after logout' -Status 'FAIL' -Code $meAfterLogout.StatusCode -Info 'Expected 401'
  }

  $login = Invoke-Json -Method 'POST' -Url "$baseUrl/api/auth/login" -Body @{ email = $email; password = $password } -Session $auth
  if ($login.StatusCode -eq 200) {
    Add-Result -Name 'Login' -Status 'PASS' -Code 200 -Info 'Session restored'
  } else {
    Add-Result -Name 'Login' -Status 'FAIL' -Code $login.StatusCode -Info 'Login failed'
  }

  $meAfterLogin = Invoke-Json -Method 'GET' -Url "$baseUrl/api/auth/me" -Body $null -Session $auth
  if ($meAfterLogin.StatusCode -eq 200 -and $meAfterLogin.Body.data.email -eq $email) {
    Add-Result -Name 'Me after login' -Status 'PASS' -Code 200 -Info 'Session restored'
  } else {
    Add-Result -Name 'Me after login' -Status 'FAIL' -Code $meAfterLogin.StatusCode -Info 'Expected 200'
  }

  Remove-Item -Path $txtPath, $mdPath -ErrorAction SilentlyContinue
}
catch {
  Add-Result -Name 'Smoke script fatal' -Status 'FAIL' -Code 0 -Info $_.Exception.Message
}
finally {
  if ($serverProcess -and -not $serverProcess.HasExited) {
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
  }

  Write-Host ''
  Write-Host '=== Smoke Test Results ==='
  $results | Format-Table -AutoSize

  $failed = @($results | Where-Object { $_.Status -eq 'FAIL' }).Count
  if ($failed -gt 0) {
    Write-Host "`nFAILED: $failed checks failed" -ForegroundColor Red
    exit 1
  }

  Write-Host "`nPASSED: all checks passed" -ForegroundColor Green
  exit 0
}
