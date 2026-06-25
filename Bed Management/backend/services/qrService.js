const QRCode = require("qrcode");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

async function generateTokenQR(trackingCode) {
  const url = `${FRONTEND_URL}/track/${trackingCode}`;
  try {
    const qrDataURL = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: "#1a237e",
        light: "#FFFFFF",
      },
    });
    return { qrCode: qrDataURL, trackingUrl: url };
  } catch (err) {
    console.error("QR generation error:", err);
    return { qrCode: null, trackingUrl: url };
  }
}

module.exports = { generateTokenQR };
