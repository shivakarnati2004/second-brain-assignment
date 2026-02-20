$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$baseUrl = 'http://127.0.0.1:3000'
$cookieJar = Join-Path $root '.smoke-cookies.txt'
$results = New-Object System.Collections.Generic.List[object]
$serverProcess = $null

function Add-Result {
  param([string]$Step,[string]$Status,[int]$Code,[string]$Info)
  $results.Add([pscustomobject]@{ Step=$Step; Status=$Status; Code=$Code; Info=$Info }) | Out-Null
}

function Invoke-CurlJson {
  param(
    [string]$Method,
    [string]$Url,
    [object]$Body,
    [bool]$UseCookie = $true
  )

  $tmp = [System.IO.Path]::GetTempFileName()
  $args = @('-sS','-o',$tmp,'-w','%{http_code}','-X',$Method)
  $bodyFile = $null

  if ($UseCookie) {
    $args += @('-b',$cookieJar,'-c',$cookieJar)
  }

  if ($null -ne $Body) {
    $json = $Body | ConvertTo-Json -Depth 8 -Compress
    $bodyFile = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($bodyFile, $json, [System.Text.Encoding]::UTF8)
    $args += @('-H','Content-Type: application/json','--data-binary',"@$bodyFile")
  }

  $args += $Url
  $statusRaw = & curl.exe @args
  $content = if (Test-Path $tmp) { Get-Content $tmp -Raw } else { '' }
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  if ($bodyFile -and (Test-Path $bodyFile)) { Remove-Item $bodyFile -Force -ErrorAction SilentlyContinue }

  $status = 0
  [void][int]::TryParse($statusRaw, [ref]$status)
  $jsonBody = $null
  try { if ($content) { $jsonBody = $content | ConvertFrom-Json } } catch {}

  return [pscustomobject]@{ StatusCode = $status; Content = $content; Json = $jsonBody }
}

function Invoke-CurlUpload {
  param([string]$Url,[string]$FilePath)

  $tmp = [System.IO.Path]::GetTempFileName()
  $args = @('-sS','-o',$tmp,'-w','%{http_code}','-b',$cookieJar,'-c',$cookieJar,'-F',"file=@$FilePath",$Url)
  $statusRaw = & curl.exe @args
  $content = if (Test-Path $tmp) { Get-Content $tmp -Raw } else { '' }
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue

  $status = 0
  [void][int]::TryParse($statusRaw, [ref]$status)
  return [pscustomobject]@{ StatusCode = $status; Content = $content }
}

try {
  if (Test-Path $cookieJar) { Remove-Item $cookieJar -Force }

  $conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
  if (-not $conn) {
    $serverProcess = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 10
  }

  $health = & curl.exe -s -o NUL -w '%{http_code}' "$baseUrl/"
  if ($health -eq '200') { Add-Result 'Server health' 'PASS' 200 'App reachable' } else { Add-Result 'Server health' 'FAIL' 0 "HTTP=$health"; throw 'Server unavailable' }

  $email = "smoke+$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
  $password = 'SmokeTest123!'

  $unauthStats = Invoke-CurlJson -Method 'GET' -Url "$baseUrl/api/stats" -Body $null -UseCookie $false
  if ($unauthStats.StatusCode -eq 401) { Add-Result 'Stats unauthorized' 'PASS' 401 'Unauth blocked' } else { Add-Result 'Stats unauthorized' 'FAIL' $unauthStats.StatusCode $unauthStats.Content }

  $register = Invoke-CurlJson -Method 'POST' -Url "$baseUrl/api/auth/register" -Body @{ email=$email; password=$password; name='Smoke User' }
  if ($register.StatusCode -in 200,201) { Add-Result 'Register' 'PASS' $register.StatusCode $email } else { Add-Result 'Register' 'FAIL' $register.StatusCode $register.Content }

  $login = Invoke-CurlJson -Method 'POST' -Url "$baseUrl/api/auth/login" -Body @{ email=$email; password=$password }
  if ($login.StatusCode -eq 200) { Add-Result 'Login' 'PASS' 200 'Login restored' } else { Add-Result 'Login' 'FAIL' $login.StatusCode $login.Content }

  $me = Invoke-CurlJson -Method 'GET' -Url "$baseUrl/api/auth/me" -Body $null
  if ($me.StatusCode -eq 200) { Add-Result 'Auth me' 'PASS' 200 'Authenticated user returned' } else { Add-Result 'Auth me' 'FAIL' $me.StatusCode $me.Content }

  $authStats = Invoke-CurlJson -Method 'GET' -Url "$baseUrl/api/stats" -Body $null
  if ($authStats.StatusCode -eq 200) { Add-Result 'Stats authorized' 'PASS' 200 'Authorized stats returned' } else { Add-Result 'Stats authorized' 'FAIL' $authStats.StatusCode $authStats.Content }

  $createItem = Invoke-CurlJson -Method 'POST' -Url "$baseUrl/api/knowledge" -Body @{
    title='Smoke Semantic Note'
    content='Vector search smoke content about embeddings, accessibility, keyboard shortcuts, and graph links.'
    type='note'
    tags=@('smoke','vector','graph')
    metadata=@{ source_name='smoke-script'; custom=@{ scenario='api' } }
  }
  if ($createItem.StatusCode -in 200,201) { Add-Result 'Create knowledge' 'PASS' $createItem.StatusCode 'Created' } else { Add-Result 'Create knowledge' 'FAIL' $createItem.StatusCode $createItem.Content }

  Start-Sleep -Seconds 2

  $listItems = Invoke-CurlJson -Method 'GET' -Url "$baseUrl/api/knowledge?search=semantic" -Body $null
  if ($listItems.StatusCode -eq 200) { Add-Result 'List knowledge' 'PASS' 200 'Listed' } else { Add-Result 'List knowledge' 'FAIL' $listItems.StatusCode $listItems.Content }

  $brain = Invoke-CurlJson -Method 'POST' -Url "$baseUrl/api/query" -Body @{ query='What do I know about vector search and keyboard shortcuts?' }
  if ($brain.StatusCode -eq 200) { Add-Result 'Brain query' 'PASS' 200 'Query returned answer' } else { Add-Result 'Brain query' 'FAIL' $brain.StatusCode $brain.Content }

  $chat = Invoke-CurlJson -Method 'POST' -Url "$baseUrl/api/chat" -Body @{ message='Summarize my smoke note briefly' }
  if ($chat.StatusCode -eq 200) { Add-Result 'Chat' 'PASS' 200 'Chat returned reply' } else { Add-Result 'Chat' 'FAIL' $chat.StatusCode $chat.Content }

  $graph = Invoke-CurlJson -Method 'GET' -Url "$baseUrl/api/graph" -Body $null
  if ($graph.StatusCode -eq 200) { Add-Result 'Graph API' 'PASS' 200 'Graph returned' } else { Add-Result 'Graph API' 'FAIL' $graph.StatusCode $graph.Content }

  $txtPath = Join-Path $root 'smoke-upload.txt'
  $mdPath = Join-Path $root 'smoke-upload.md'
  Set-Content -Path $txtPath -Value 'Smoke upload text file about semantic search and graph relationships.' -Encoding UTF8
  Set-Content -Path $mdPath -Value '# Smoke Upload`nThis markdown covers accessibility and command palette shortcuts.' -Encoding UTF8

  $upTxt = Invoke-CurlUpload -Url "$baseUrl/api/upload" -FilePath $txtPath
  if ($upTxt.StatusCode -eq 200) { Add-Result 'Upload TXT' 'PASS' 200 'TXT extraction ok' } else { Add-Result 'Upload TXT' 'FAIL' $upTxt.StatusCode $upTxt.Content }

  $upMd = Invoke-CurlUpload -Url "$baseUrl/api/upload" -FilePath $mdPath
  if ($upMd.StatusCode -eq 200) { Add-Result 'Upload MD' 'PASS' 200 'MD extraction ok' } else { Add-Result 'Upload MD' 'FAIL' $upMd.StatusCode $upMd.Content }

  $logout = Invoke-CurlJson -Method 'POST' -Url "$baseUrl/api/auth/logout" -Body @{}
  if ($logout.StatusCode -eq 200) { Add-Result 'Logout' 'PASS' 200 'Logged out' } else { Add-Result 'Logout' 'FAIL' $logout.StatusCode $logout.Content }

  $meAfter = Invoke-CurlJson -Method 'GET' -Url "$baseUrl/api/auth/me" -Body $null
  if ($meAfter.StatusCode -eq 401) { Add-Result 'Me after logout' 'PASS' 401 'Session invalidated' } else { Add-Result 'Me after logout' 'FAIL' $meAfter.StatusCode $meAfter.Content }

  $loginAgain = Invoke-CurlJson -Method 'POST' -Url "$baseUrl/api/auth/login" -Body @{ email=$email; password=$password }
  if ($loginAgain.StatusCode -eq 200) { Add-Result 'Login again' 'PASS' 200 'Login restored' } else { Add-Result 'Login again' 'FAIL' $loginAgain.StatusCode $loginAgain.Content }
}
catch {
  Add-Result 'Smoke fatal' 'FAIL' 0 $_.Exception.Message
}
finally {
  Remove-Item -Path (Join-Path $root 'smoke-upload.txt'), (Join-Path $root 'smoke-upload.md'), $cookieJar -Force -ErrorAction SilentlyContinue
  if ($serverProcess -and -not $serverProcess.HasExited) { Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue }

  Write-Host ''
  Write-Host '=== Smoke Test Results (curl) ==='
  $results | Format-Table -AutoSize
  $failed = @($results | Where-Object { $_.Status -eq 'FAIL' }).Count
  if ($failed -gt 0) { Write-Host "`nFAILED: $failed checks failed" -ForegroundColor Red; exit 1 }
  Write-Host "`nPASSED: all checks passed" -ForegroundColor Green
  exit 0
}
