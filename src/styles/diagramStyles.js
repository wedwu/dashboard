export const styles =  {
  wrapper: {
    display: "flex",
    position: "relative",
    gap: 80,
    padding: 40,
    background: "#111",
    color: "black",
    minHeight: "100vh",
    width: "100%",
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  device: {
    position: "relative",
    background: "rgb(17, 17, 17)",
    padding: "10px 16px",
    fontFamily: "monospace",
    fontSize: 12,
    minWidth: 220,
    minHeight: 100,
    zIndex: 9999,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    position: "absolute",
    top: 4,
    right: 4,
  },
  svg: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    overflow: "visible",
  },
  menuIconWrapper: {
    position: "absolute",
    top: -20,
    right: -5,
    width: 25,
    height: 25,
    pointerEvents: "none",
  },
  menuIconContainer: {
    color: 'white',
    width: '40px',
    height: '40px',
    borderRadius: '40px',
    textAlign: 'center',
    lineHeight: '4.8',
  }
};

export const STATUS_COLORS = {
  up: "#2ecc71",
  down: "#e74c3c",
  unknown: "#7f8c8d",
};

