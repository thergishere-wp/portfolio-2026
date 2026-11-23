import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon: "RG" with the violet dot, on the paper colour. */
export default function Icon() {
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
          borderRadius: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: -3,
            lineHeight: 1,
            color: "#141414",
          }}
        >
          RG
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: 9,
              background: "#5B3DF5",
              marginLeft: 2,
              marginBottom: 5,
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
