# One-time setup: download the Play upload keystore from EAS into this project.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$keystorePath = Join-Path $root "android\app\upload-keystore.jks"
$propsPath = Join-Path $root "android\keystore.properties"
$examplePath = Join-Path $root "android\keystore.properties.example"

Write-Host ""
Write-Host "Luniq Clinic — Android release signing setup" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Google Play expects upload certificate SHA1:"
Write-Host "  7C:BB:5C:AD:D3:41:C8:8E:9F:66:6F:AB:66:F0:00:21:83:E0:D0:52"
Write-Host ""
Write-Host "Steps:"
Write-Host "  1. EAS credentials will open (logged in as luniqcare)."
Write-Host "  2. Choose: Android → production → Keystore → Download existing keystore"
Write-Host "  3. Save the file as: android\app\upload-keystore.jks"
Write-Host "  4. Note the keystore password, key alias, and key password from EAS."
Write-Host "  5. Copy android\keystore.properties.example → android\keystore.properties"
Write-Host "     and fill in the passwords and alias."
Write-Host ""
Read-Host "Press Enter to open EAS credentials"

npx eas-cli credentials -p android

if (-not (Test-Path $keystorePath)) {
    Write-Host ""
    Write-Host "upload-keystore.jks not found at android\app\upload-keystore.jks" -ForegroundColor Yellow
    Write-Host "Save the downloaded keystore there, then re-run this script or create keystore.properties manually."
    exit 1
}

if (-not (Test-Path $propsPath)) {
    Copy-Item $examplePath $propsPath
    Write-Host ""
    Write-Host "Created android\keystore.properties — edit it with your EAS keystore passwords." -ForegroundColor Yellow
    notepad $propsPath
    Read-Host "Press Enter after saving keystore.properties"
}

Write-Host ""
Write-Host "Verifying certificate fingerprint..." -ForegroundColor Cyan
$alias = (Get-Content $propsPath | Where-Object { $_ -match '^keyAlias=' }) -replace '^keyAlias=', ''
if (-not $alias) {
    Write-Host "Set keyAlias in keystore.properties first." -ForegroundColor Red
    exit 1
}

keytool -list -v -keystore $keystorePath -alias $alias 2>&1 | Select-String "SHA1"

Write-Host ""
Write-Host "If SHA1 matches 7C:BB:5C:AD:..., build a release bundle with:"
Write-Host "  npm run android:bundle:local"
Write-Host ""
