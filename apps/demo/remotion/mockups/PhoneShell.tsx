import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  scale?: number;
  style?: CSSProperties;
};

const PHONE_WIDTH = 420;
const PHONE_HEIGHT = 860;

export const PhoneShell: React.FC<Props> = ({ children, scale = 1, style }) => {
  return (
    <div
      style={{
        width: PHONE_WIDTH,
        height: PHONE_HEIGHT,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        background: "#111111",
        borderRadius: 52,
        padding: 12,
        boxShadow: "0 30px 60px rgba(0,0,0,0.45), 0 6px 20px rgba(0,0,0,0.25)",
        position: "relative",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 22,
          left: "50%",
          transform: "translateX(-50%)",
          width: 120,
          height: 30,
          background: "#000",
          borderRadius: 20,
          zIndex: 2,
        }}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 40,
          overflow: "hidden",
          background: "#fff",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const PHONE_DIMENSIONS = { width: PHONE_WIDTH, height: PHONE_HEIGHT };
