import "server-only";
import QRCode from "qrcode";

/**
 * Generate a QR code as a data URL.
 * Encodes the verification URL (the door-side scanner reads this).
 *
 * Dark theme: black background, mint foreground.
 */
export async function generateQRDataUrl(token: string, opts?: { baseUrl?: string }): Promise<string> {
  const baseUrl = opts?.baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const text = `${baseUrl}/api/qr/verify/${encodeURIComponent(token)}`;
  return QRCode.toDataURL(text, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: "H",
    color: {
      dark: "#00ff9d",
      light: "#000000",
    },
  });
}
