import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Chiffrement symétrique AES-256-GCM pour les secrets sensibles persistés
 * (ex. secret TOTP d'un compte). La clé vient de SECRETS_ENCRYPTION_KEY
 * (32 octets, hex) — jamais du code.
 *
 * Format de sortie : "<ivHex>:<authTagHex>:<cipherTextHex>"
 */
export class SecretBox {
  private readonly key: Buffer;

  constructor(hexKey: string) {
    const key = Buffer.from(hexKey, "hex");
    if (key.length !== 32) {
      throw new Error(
        "SECRETS_ENCRYPTION_KEY doit être une clé hexadécimale de 32 octets (64 caractères).",
      );
    }
    this.key = key;
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const cipherText = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${cipherText.toString("hex")}`;
  }

  decrypt(payload: string): string {
    const [ivHex, authTagHex, cipherTextHex] = payload.split(":");
    if (!ivHex || !authTagHex || !cipherTextHex) {
      throw new Error("Format de secret chiffré invalide.");
    }
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    const plainText = Buffer.concat([
      decipher.update(Buffer.from(cipherTextHex, "hex")),
      decipher.final(),
    ]);
    return plainText.toString("utf8");
  }
}
