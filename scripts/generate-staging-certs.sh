#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="${SCRIPT_DIR}/../docker/certs/staging"
MYSQL_DIR="${CERT_DIR}/mysql"
BACKEND_DIR="${CERT_DIR}/backend"

mkdir -p "${MYSQL_DIR}" "${BACKEND_DIR}"

CA_KEY="${CERT_DIR}/ca-key.pem"
CA_CERT="${CERT_DIR}/ca.pem"
openssl genrsa -out "${CA_KEY}" 2048
openssl req -new -x509 -nodes -days 3650 -key "${CA_KEY}" -out "${CA_CERT}" -subj "/CN=SanitarywareCRM-Staging-CA/O=SanitarywareCRM"

SERVER_KEY="${MYSQL_DIR}/server-key.pem"
SERVER_CSR="${MYSQL_DIR}/server.csr"
SERVER_CERT="${MYSQL_DIR}/server-cert.pem"

openssl genrsa -out "${SERVER_KEY}" 2048

CNF_FILE="${CERT_DIR}/openssl.cnf"
cat > "${CNF_FILE}" <<EOF
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
EOF

openssl req -new -key "${SERVER_KEY}" -out "${SERVER_CSR}" -config "${CNF_FILE}"
openssl x509 -req -in "${SERVER_CSR}" -CA "${CA_CERT}" -CAkey "${CA_KEY}" -CAcreateserial -out "${SERVER_CERT}" -days 3650 -extfile "${CNF_FILE}" -extensions v3_req

cp -f "${CA_CERT}" "${MYSQL_DIR}/ca.pem"

TRUSTSTORE="${BACKEND_DIR}/truststore.p12"
rm -f "${TRUSTSTORE}"
keytool -importcert -noprompt -alias mysql-staging-ca -file "${CA_CERT}" -keystore "${TRUSTSTORE}" -storetype PKCS12 -storepass "staging_truststore_secret"

echo "Staging certificates generated successfully in ${CERT_DIR}"
