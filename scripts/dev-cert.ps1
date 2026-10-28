# 使用 PowerShell 7 / .NET 生成本地开发证书，不修改系统受信任证书库。
param([switch]$Force)
$ErrorActionPreference = 'Stop'
$certDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.certs'))
$certificatePath = Join-Path $certDirectory 'dev-cert.pem'
$keyPath = Join-Path $certDirectory 'dev-key.pem'
if (!$Force -and (Test-Path -LiteralPath $certificatePath) -and (Test-Path -LiteralPath $keyPath)) {
    Write-Host 'Development certificate already exists. Use -Force to regenerate after LAN IP changes.'
    exit 0
}
[IO.Directory]::CreateDirectory($certDirectory) | Out-Null
$rsa = [Security.Cryptography.RSA]::Create(2048)
try {
    $request = [Security.Cryptography.X509Certificates.CertificateRequest]::new('CN=WebRTC Demo Development', $rsa, [Security.Cryptography.HashAlgorithmName]::SHA256, [Security.Cryptography.RSASignaturePadding]::Pkcs1)
    $names = [Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
    $names.AddDnsName('localhost')
    $names.AddDnsName([Environment]::MachineName)
    $addresses = @([Net.IPAddress]::Loopback, [Net.IPAddress]::IPv6Loopback)
    $addresses += [Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
        Where-Object OperationalStatus -eq Up |
        ForEach-Object { $_.GetIPProperties().UnicastAddresses } |
        ForEach-Object { $_.Address } |
        Where-Object { $_.AddressFamily -eq [Net.Sockets.AddressFamily]::InterNetwork }
    $addresses | Sort-Object -Property IPAddressToString -Unique | ForEach-Object { $names.AddIpAddress($_) }
    $request.CertificateExtensions.Add($names.Build())
    $request.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($false, $false, 0, $true))
    $usage = [Security.Cryptography.X509Certificates.X509KeyUsageFlags]::DigitalSignature -bor [Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyEncipherment
    $request.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509KeyUsageExtension]::new($usage, $true))
    $oids = [Security.Cryptography.OidCollection]::new()
    $oids.Add([Security.Cryptography.Oid]::new('1.3.6.1.5.5.7.3.1')) | Out-Null
    $request.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]::new($oids, $false))
    $certificate = $request.CreateSelfSigned([DateTimeOffset]::UtcNow.AddMinutes(-5), [DateTimeOffset]::UtcNow.AddDays(365))
    [IO.File]::WriteAllText($certificatePath, $certificate.ExportCertificatePem())
    [IO.File]::WriteAllText($keyPath, $rsa.ExportPkcs8PrivateKeyPem())
    $certificate.Dispose()
    Write-Host "Development certificate created in $certDirectory"
    Write-Host 'Browser trust must be configured separately; this script does not install trust.'
} finally { $rsa.Dispose() }
