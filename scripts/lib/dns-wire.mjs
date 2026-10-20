// Client DNS minimal (UDP, RFC 1035) pour interroger un serveur précis, le registre compris
// (d.nic.fr), ce que le résolveur de Node ne sait pas faire pour les types DS et DNSKEY. EDNS0 avec
// le bit DO : la réponse dit si le résolveur a validé DNSSEC (bit AD). Logique pure + transport injecté.
export const TYPES = { A: 1, NS: 2, MX: 15, DS: 43, DNSKEY: 48 };
const HEADER = 12;
const EDNS_PAYLOAD = 1232;
const DO_BIT = 0x8000;
const POINTER = 0xc0;

/** Requête : identifiant, récursion demandée, une question, un OPT avec le bit DO. */
export function encodeQuery(id, name, type) {
  const labels = name.replace(/\.$/, '').split('.');
  const qname = Buffer.concat([
    ...labels.map((label) => Buffer.concat([Buffer.from([label.length]), Buffer.from(label)])),
    Buffer.from([0]),
  ]);
  const header = Buffer.alloc(HEADER);
  header.writeUInt16BE(id, 0);
  header.writeUInt16BE(0x0100, 2);
  header.writeUInt16BE(1, 4);
  header.writeUInt16BE(1, 10);
  const question = Buffer.alloc(4);
  question.writeUInt16BE(TYPES[type], 0);
  question.writeUInt16BE(1, 2);
  const opt = Buffer.from([0, 0, 41, 0, 0, 0, 0, 0, 0, 0, 0]);
  opt.writeUInt16BE(EDNS_PAYLOAD, 3);
  opt.writeUInt16BE(DO_BIT, 7);
  return Buffer.concat([header, qname, question, opt]);
}

/** Nom à `offset`, pointeurs de compression suivis ; renvoie le nom et l'octet suivant. */
export function readName(message, offset) {
  const labels = [];
  let position = offset;
  let next = -1;
  for (let jumps = 0; jumps < HEADER; jumps += 1) {
    const length = message[position];
    if (length === 0) return { name: labels.join('.'), next: next < 0 ? position + 1 : next };
    if ((length & POINTER) === POINTER) {
      if (next < 0) next = position + 2;
      position = message.readUInt16BE(position) & 0x3fff;
    } else {
      labels.push(message.toString('latin1', position + 1, position + 1 + length));
      position += length + 1;
    }
  }
  throw new Error('Nom DNS malformé.');
}

const readRecord = (message, offset) => {
  const { name, next } = readName(message, offset);
  const type = message.readUInt16BE(next);
  const length = message.readUInt16BE(next + 8);
  const start = next + 10;
  const target = type === TYPES.NS ? readName(message, start).name : null;
  const exchange = type === TYPES.MX ? readName(message, start + 2).name : null;
  const keyTag = type === TYPES.DS ? message.readUInt16BE(start) : null;
  return { record: { name, type, target: target ?? exchange, keyTag }, next: start + length };
};

/** Réponse : code, bit AD, et enregistrements des sections réponse et autorité. */
export function decodeResponse(message) {
  const flags = message.readUInt16BE(2);
  const counts = [6, 8, 10].map((at) => message.readUInt16BE(at));
  let offset = readName(message, HEADER).next + 4;
  const sections = counts.map((count) => {
    const records = [];
    for (let index = 0; index < count; index += 1) {
      const { record, next } = readRecord(message, offset);
      records.push(record);
      offset = next;
    }
    return records;
  });
  return {
    rcode: flags & 0xf,
    ad: (flags & 0x20) !== 0,
    answer: sections[0],
    authority: sections[1],
  };
}
