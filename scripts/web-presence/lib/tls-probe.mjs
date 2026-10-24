// Poignée de main TLS réelle vers `host:443` : protocole négocié et certificat présenté. Node
// vérifie la chaîne et le nom d'hôte (`rejectUnauthorized`) : un certificat invalide est une erreur.
import { connect } from 'node:tls';

const TLS_TIMEOUT_MS = 10_000;
const HTTPS_PORT = 443;

/** @returns {Promise<{ protocol: string | null, validTo: number, altNames: string }>} */
export const probeTls = (host) =>
  new Promise((resolve, reject) => {
    const socket = connect(
      { host, port: HTTPS_PORT, servername: host, timeout: TLS_TIMEOUT_MS },
      () => {
        const cert = socket.getPeerCertificate();
        resolve({
          protocol: socket.getProtocol(),
          validTo: Date.parse(cert.valid_to),
          altNames: cert.subjectaltname ?? '',
        });
        socket.end();
      },
    );
    socket.on('timeout', () =>
      socket.destroy(Object.assign(new Error('délai dépassé'), { code: 'ETIMEDOUT' })),
    );
    socket.on('error', reject);
  });
