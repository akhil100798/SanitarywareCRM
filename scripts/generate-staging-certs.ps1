# Script to generate trusted staging certificates for MySQL and Java Backend
$ErrorActionPreference = "Stop"

$CertDir = Join-Path $PSScriptRoot "..\docker\certs\staging"
$MysqlDir = Join-Path $CertDir "mysql"
$BackendDir = Join-Path $CertDir "backend"

New-Item -ItemType Directory -Path $MysqlDir -Force | Out-Null
New-Item -ItemType Directory -Path $BackendDir -Force | Out-Null

$Openssl = "C:\Program Files\Git\usr\bin\openssl.exe"
if (Test-Path "C:\Program Files\Git\usr\ssl\openssl.cnf") {
    $env:OPENSSL_CONF = "C:\Program Files\Git\usr\ssl\openssl.cnf"
}
if (-not (Test-Path $Openssl)) {
    $Openssl = "openssl"
}

# 1. Generate CA key and certificate
$CaKey = Join-Path $CertDir "ca-key.pem"
$CaCert = Join-Path $CertDir "ca.pem"
& $Openssl genrsa -out $CaKey 2048
& $Openssl req -new -x509 -nodes -days 3650 -key $CaKey -out $CaCert -subj "/CN=SanitarywareCRM-Staging-CA/O=SanitarywareCRM"

# 2. Generate Server key and CSR
$ServerKey = Join-Path $MysqlDir "server-key.pem"
$ServerCsr = Join-Path $MysqlDir "server.csr"
$ServerCert = Join-Path $MysqlDir "server-cert.pem"

& $Openssl genrsa -out $ServerKey 2048

$CnfContent = @"
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = mysql
O = SanitarywareCRM

[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = mysql
DNS.2 = localhost
IP.1 = 127.0.0.1
"@

$CnfFile = Join-Path $CertDir "openssl.cnf"
Set-Content -Path $CnfFile -Value $CnfContent

& $Openssl req -new -key $ServerKey -out $ServerCsr -config $CnfFile
& $Openssl x509 -req -in $ServerCsr -CA $CaCert -CAkey $CaKey -CAcreateserial -out $ServerCert -days 3650 -extfile $CnfFile -extensions v3_req

# Copy CA to mysql dir as well
Copy-Item $CaCert (Join-Path $MysqlDir "ca.pem") -Force

# 3. Create PKCS12 truststore for Java backend containing the CA cert
$Truststore = Join-Path $BackendDir "truststore.p12"
if (Test-Path $Truststore) {
    Remove-Item $Truststore -Force
}

$Keytool = "keytool"
& $Keytool -importcert -noprompt -alias mysql-staging-ca -file $CaCert -keystore $Truststore -storetype PKCS12 -storepass "staging_truststore_secret"

Write-Host "Staging certificates generated successfully in $CertDir"
