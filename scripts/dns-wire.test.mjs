// Client DNS minimal : encodage et décodage sur des messages fabriqués, sans réseau.
import { describe, expect, it } from 'vitest';
import { TYPES, decodeResponse, encodeQuery, readName } from './lib/dns-wire.mjs';

// Réponse : la requête encodée, drapeaux réécrits, puis des MX qui pointent vers le nom (offset 12).
const mxResponse = (hosts, flags) => {
  const query = encodeQuery(7, 'paulperigault.fr', 'MX');
  const question = query.subarray(0, query.length - 11);
  question.writeUInt16BE(flags, 2);
  question.writeUInt16BE(hosts.length, 6);
  question.writeUInt16BE(0, 10);
  const records = hosts.map((host) => {
    const exchange = Buffer.concat([
      ...host.split('.').map((label) => Buffer.from([label.length, ...Buffer.from(label)])),
      Buffer.from([0]),
    ]);
    const fixed = Buffer.alloc(12);
    fixed.writeUInt16BE(0xc00c, 0);
    fixed.writeUInt16BE(TYPES.MX, 2);
    fixed.writeUInt16BE(1, 4);
    fixed.writeUInt16BE(exchange.length + 2, 10);
    return Buffer.concat([fixed, Buffer.from([0, 10]), exchange]);
  });
  return Buffer.concat([question, ...records]);
};

describe('dns-wire', () => {
  it('encode une requête EDNS avec le bit DO', () => {
    const query = encodeQuery(1, 'paulperigault.fr', 'DS');
    expect(readName(query, 12)).toEqual({ name: 'paulperigault.fr', next: 30 });
    expect(query.readUInt16BE(30)).toBe(TYPES.DS);
    expect(query.readUInt16BE(query.length - 4)).toBe(0x8000);
  });

  it('décode toutes les réponses, pointeurs de compression et bit AD compris', () => {
    const decoded = decodeResponse(
      mxResponse(['mx01.mail.icloud.com', 'mx02.mail.icloud.com'], 0x81a0),
    );
    expect(decoded.ad).toBe(true);
    expect(decoded.answer.map((record) => record.target)).toEqual([
      'mx01.mail.icloud.com',
      'mx02.mail.icloud.com',
    ]);
  });
});
