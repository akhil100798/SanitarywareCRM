$ErrorActionPreference = "Stop"

$repoRoot = "C:\Users\akhil\OneDrive\Desktop\Workspace\New folder\SanitarywareCRM"
$mvnPath = "C:\Users\akhil\.m2\wrapper\dists\apache-maven-3.9.14\ed7edd442f634ac1c1ef5ba2b61b6d690b5221091f1a8e1123f5fadcc967520d\bin\mvn.cmd"
$truststore = "$repoRoot/docker/certs/staging/backend/truststore.p12" -replace '\\','/'

$env:PHASE1_MYSQL_URL = "jdbc:mysql://127.0.0.1:3306/phase1_crm_staging?createDatabaseIfNotExist=true&sslMode=VERIFY_IDENTITY&trustCertificateKeyStoreUrl=file:///$truststore&trustCertificateKeyStorePassword=staging_truststore_secret&trustCertificateKeyStoreType=PKCS12"
$env:PHASE1_MYSQL_USERNAME = "crm_user"
$env:PHASE1_MYSQL_PASSWORD = "staging_crm_password_123"
$env:PHASE1_JWT_SECRET = "staging_super_secret_jwt_key_that_is_long_enough_for_sha256"

Write-Host "Running FinancialIntegrityMySqlIT against MySQL 8.4 container..."
Set-Location "$repoRoot\backend"
& $mvnPath test -Dtest=FinancialIntegrityMySqlIT
exit $LASTEXITCODE
