import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the same mark, full-bleed (iOS rounds the corners). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F2F0EC",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            fontSize: 100,
            fontWeight: 700,
            letterSpacing: -8,
            lineHeight: 1,
            color: "#141414",
          }}
        >
          RG
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 24,
              background: "#5B3DF5",
              marginLeft: 5,
              marginBottom: 14,
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
