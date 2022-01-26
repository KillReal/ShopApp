const encryption = require('crypto');

const algorithm = 'aes-256-ctr';
const secretKey = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3';
const iv = new Uint8Array(16);

export const encrypt = (text :any) => {
    const cipher = encryption.createCipheriv(algorithm, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return {
        iv: iv.toString(),
        content: encrypted.toString('hex')
    };
};

export const decrypt = (hash :any) => {
    const decipher = encryption.createDecipheriv(algorithm, secretKey, iv, 'hex');
    const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash, 'hex')), decipher.final()]);
    return decrpyted.toString();
};