import { randomBytes } from "crypto";
import { SecretBox } from "../src/common/utils/crypto.util";

describe("SecretBox", () => {
  const key = randomBytes(32).toString("hex");

  it("chiffre puis déchiffre pour retrouver le texte d'origine", () => {
    const box = new SecretBox(key);
    const plainText = "JBSWY3DPEHPK3PXP"; // exemple de secret TOTP en base32
    const encrypted = box.encrypt(plainText);
    expect(encrypted).not.toContain(plainText);
    expect(box.decrypt(encrypted)).toBe(plainText);
  });

  it("produit un texte chiffré différent à chaque appel (IV aléatoire)", () => {
    const box = new SecretBox(key);
    const a = box.encrypt("same-secret");
    const b = box.encrypt("same-secret");
    expect(a).not.toBe(b);
  });

  it("refuse une clé qui ne fait pas 32 octets", () => {
    expect(() => new SecretBox("trop-court")).toThrow();
  });
});
