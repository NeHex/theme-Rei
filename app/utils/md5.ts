function rotateLeft(value: number, shift: number) {
  return (value << shift) | (value >>> (32 - shift));
}

function addUnsigned(a: number, b: number) {
  const a4 = a & 0x40000000;
  const b4 = b & 0x40000000;
  const a8 = a & 0x80000000;
  const b8 = b & 0x80000000;
  const result = (a & 0x3fffffff) + (b & 0x3fffffff);

  if (a4 & b4) return result ^ 0x80000000 ^ a8 ^ b8;
  if (a4 | b4) {
    if (result & 0x40000000) return result ^ 0xc0000000 ^ a8 ^ b8;
    return result ^ 0x40000000 ^ a8 ^ b8;
  }

  return result ^ a8 ^ b8;
}

function md5Cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
  return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, q), addUnsigned(x, t)), s), b);
}

function md5Ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return md5Cmn((b & c) | (~b & d), a, b, x, s, t);
}

function md5Gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return md5Cmn((b & d) | (c & ~d), a, b, x, s, t);
}

function md5Hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return md5Cmn(b ^ c ^ d, a, b, x, s, t);
}

function md5Ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return md5Cmn(c ^ (b | ~d), a, b, x, s, t);
}

function toWordArray(input: string) {
  const messageLength = input.length;
  const words: number[] = [];
  let index = 0;

  while (index < messageLength) {
    const wordIndex = index >> 2;
    const byteOffset = (index % 4) * 8;
    words[wordIndex] = words[wordIndex] ?? 0;
    words[wordIndex] |= input.charCodeAt(index) << byteOffset;
    index += 1;
  }

  const wordIndex = messageLength >> 2;
  const byteOffset = (messageLength % 4) * 8;
  words[wordIndex] = words[wordIndex] ?? 0;
  words[wordIndex] |= 0x80 << byteOffset;

  const lengthWordIndex = (((messageLength + 8) >> 6) + 1) * 16 - 2;
  words[lengthWordIndex] = messageLength << 3;
  words[lengthWordIndex + 1] = messageLength >>> 29;

  return words;
}

function toHex(value: number) {
  let output = "";
  for (let i = 0; i < 4; i += 1) {
    const byte = (value >>> (i * 8)) & 0xff;
    output += byte.toString(16).padStart(2, "0");
  }
  return output;
}

function toUtf8(input: string) {
  return unescape(encodeURIComponent(input));
}

export function md5Hex(input: string) {
  const words = toWordArray(toUtf8(input));
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let i = 0; i < words.length; i += 16) {
    const aa = a;
    const bb = b;
    const cc = c;
    const dd = d;

    a = md5Ff(a, b, c, d, words[i + 0]!, 7, 0xd76aa478);
    d = md5Ff(d, a, b, c, words[i + 1]!, 12, 0xe8c7b756);
    c = md5Ff(c, d, a, b, words[i + 2]!, 17, 0x242070db);
    b = md5Ff(b, c, d, a, words[i + 3]!, 22, 0xc1bdceee);
    a = md5Ff(a, b, c, d, words[i + 4]!, 7, 0xf57c0faf);
    d = md5Ff(d, a, b, c, words[i + 5]!, 12, 0x4787c62a);
    c = md5Ff(c, d, a, b, words[i + 6]!, 17, 0xa8304613);
    b = md5Ff(b, c, d, a, words[i + 7]!, 22, 0xfd469501);
    a = md5Ff(a, b, c, d, words[i + 8]!, 7, 0x698098d8);
    d = md5Ff(d, a, b, c, words[i + 9]!, 12, 0x8b44f7af);
    c = md5Ff(c, d, a, b, words[i + 10]!, 17, 0xffff5bb1);
    b = md5Ff(b, c, d, a, words[i + 11]!, 22, 0x895cd7be);
    a = md5Ff(a, b, c, d, words[i + 12]!, 7, 0x6b901122);
    d = md5Ff(d, a, b, c, words[i + 13]!, 12, 0xfd987193);
    c = md5Ff(c, d, a, b, words[i + 14]!, 17, 0xa679438e);
    b = md5Ff(b, c, d, a, words[i + 15]!, 22, 0x49b40821);

    a = md5Gg(a, b, c, d, words[i + 1]!, 5, 0xf61e2562);
    d = md5Gg(d, a, b, c, words[i + 6]!, 9, 0xc040b340);
    c = md5Gg(c, d, a, b, words[i + 11]!, 14, 0x265e5a51);
    b = md5Gg(b, c, d, a, words[i + 0]!, 20, 0xe9b6c7aa);
    a = md5Gg(a, b, c, d, words[i + 5]!, 5, 0xd62f105d);
    d = md5Gg(d, a, b, c, words[i + 10]!, 9, 0x02441453);
    c = md5Gg(c, d, a, b, words[i + 15]!, 14, 0xd8a1e681);
    b = md5Gg(b, c, d, a, words[i + 4]!, 20, 0xe7d3fbc8);
    a = md5Gg(a, b, c, d, words[i + 9]!, 5, 0x21e1cde6);
    d = md5Gg(d, a, b, c, words[i + 14]!, 9, 0xc33707d6);
    c = md5Gg(c, d, a, b, words[i + 3]!, 14, 0xf4d50d87);
    b = md5Gg(b, c, d, a, words[i + 8]!, 20, 0x455a14ed);
    a = md5Gg(a, b, c, d, words[i + 13]!, 5, 0xa9e3e905);
    d = md5Gg(d, a, b, c, words[i + 2]!, 9, 0xfcefa3f8);
    c = md5Gg(c, d, a, b, words[i + 7]!, 14, 0x676f02d9);
    b = md5Gg(b, c, d, a, words[i + 12]!, 20, 0x8d2a4c8a);

    a = md5Hh(a, b, c, d, words[i + 5]!, 4, 0xfffa3942);
    d = md5Hh(d, a, b, c, words[i + 8]!, 11, 0x8771f681);
    c = md5Hh(c, d, a, b, words[i + 11]!, 16, 0x6d9d6122);
    b = md5Hh(b, c, d, a, words[i + 14]!, 23, 0xfde5380c);
    a = md5Hh(a, b, c, d, words[i + 1]!, 4, 0xa4beea44);
    d = md5Hh(d, a, b, c, words[i + 4]!, 11, 0x4bdecfa9);
    c = md5Hh(c, d, a, b, words[i + 7]!, 16, 0xf6bb4b60);
    b = md5Hh(b, c, d, a, words[i + 10]!, 23, 0xbebfbc70);
    a = md5Hh(a, b, c, d, words[i + 13]!, 4, 0x289b7ec6);
    d = md5Hh(d, a, b, c, words[i + 0]!, 11, 0xeaa127fa);
    c = md5Hh(c, d, a, b, words[i + 3]!, 16, 0xd4ef3085);
    b = md5Hh(b, c, d, a, words[i + 6]!, 23, 0x04881d05);
    a = md5Hh(a, b, c, d, words[i + 9]!, 4, 0xd9d4d039);
    d = md5Hh(d, a, b, c, words[i + 12]!, 11, 0xe6db99e5);
    c = md5Hh(c, d, a, b, words[i + 15]!, 16, 0x1fa27cf8);
    b = md5Hh(b, c, d, a, words[i + 2]!, 23, 0xc4ac5665);

    a = md5Ii(a, b, c, d, words[i + 0]!, 6, 0xf4292244);
    d = md5Ii(d, a, b, c, words[i + 7]!, 10, 0x432aff97);
    c = md5Ii(c, d, a, b, words[i + 14]!, 15, 0xab9423a7);
    b = md5Ii(b, c, d, a, words[i + 5]!, 21, 0xfc93a039);
    a = md5Ii(a, b, c, d, words[i + 12]!, 6, 0x655b59c3);
    d = md5Ii(d, a, b, c, words[i + 3]!, 10, 0x8f0ccc92);
    c = md5Ii(c, d, a, b, words[i + 10]!, 15, 0xffeff47d);
    b = md5Ii(b, c, d, a, words[i + 1]!, 21, 0x85845dd1);
    a = md5Ii(a, b, c, d, words[i + 8]!, 6, 0x6fa87e4f);
    d = md5Ii(d, a, b, c, words[i + 15]!, 10, 0xfe2ce6e0);
    c = md5Ii(c, d, a, b, words[i + 6]!, 15, 0xa3014314);
    b = md5Ii(b, c, d, a, words[i + 13]!, 21, 0x4e0811a1);
    a = md5Ii(a, b, c, d, words[i + 4]!, 6, 0xf7537e82);
    d = md5Ii(d, a, b, c, words[i + 11]!, 10, 0xbd3af235);
    c = md5Ii(c, d, a, b, words[i + 2]!, 15, 0x2ad7d2bb);
    b = md5Ii(b, c, d, a, words[i + 9]!, 21, 0xeb86d391);

    a = addUnsigned(a, aa);
    b = addUnsigned(b, bb);
    c = addUnsigned(c, cc);
    d = addUnsigned(d, dd);
  }

  return (toHex(a) + toHex(b) + toHex(c) + toHex(d)).toLowerCase();
}
