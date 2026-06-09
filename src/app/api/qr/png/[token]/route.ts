import QRCode from "qrcode";
import { NextResponse } from "next/server";

/**
 * Serve a QR code as PNG. Used in confirmation emails (data URLs get
 * stripped by Gmail). The token IS the credential; possession of the URL
 * implies access — same as any QR-bearing link.
 *
 * Cached aggressively at the edge: same token → same image, forever.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await ctx.params;
  if (!token || token.length < 8) {
    return new NextResponse("Invalid token", { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const verifyUrl = `${baseUrl}/api/qr/verify/${encodeURIComponent(token)}`;

  const png = await QRCode.toBuffer(verifyUrl, {
    type: "png",
    width: 480,
    margin: 1,
    errorCorrectionLevel: "H",
    color: {
      dark: "#00ff9d",
      light: "#000000",
    },
  });

  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
