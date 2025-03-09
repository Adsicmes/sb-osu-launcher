// DPAPIUtil.ts
import CryptoJS from 'crypto-js';

export class DPAPIUtil {
  /**
   * 使用AES加密字符串
   * @param plainText 要加密的明文
   * @param secretKey 加密密钥
   * @returns 加密后的字符串(Base64编码)
   */
  public static encrypt(plainText: string, secretKey: string): string {
    try {
      // 从secretKey生成密钥
      const key = CryptoJS.SHA256(secretKey).toString().substring(0, 32);
      const iv = CryptoJS.SHA256(secretKey).toString().substring(0, 16);
      
      // 加密数据
      const encrypted = CryptoJS.AES.encrypt(plainText, CryptoJS.enc.Utf8.parse(key), {
        iv: CryptoJS.enc.Utf8.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      return encrypted.toString();
    } catch (error) {
      console.error('加密失败:', error);
      return '';
    }
  }

  /**
   * 使用AES解密字符串
   * @param encryptedText 要解密的密文(Base64编码)
   * @param secretKey 解密密钥
   * @returns 解密后的明文
   */
  public static decrypt(encryptedText: string, secretKey: string): string {
    try {
      // 从secretKey生成密钥(与加密时相同)
      const key = CryptoJS.SHA256(secretKey).toString().substring(0, 32);
      const iv = CryptoJS.SHA256(secretKey).toString().substring(0, 16);
      
      // 解密数据
      const decrypted = CryptoJS.AES.decrypt(encryptedText, CryptoJS.enc.Utf8.parse(key), {
        iv: CryptoJS.enc.Utf8.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('解密失败:', error);
      return '';
    }
  }
}