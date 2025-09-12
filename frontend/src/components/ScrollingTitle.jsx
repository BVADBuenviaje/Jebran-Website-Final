import React from "react";
import "./ScrollingTitle.css";

const ScrollingTitle = ({ text, repetitions = 2000, speed = 10000 }) => {
  // Create array of repeated text for seamless loop
  const repeatedText = Array(repetitions).fill(text);

  return (
    <div
      className="scroller"
      style={{
        overflow: "hidden",
        whiteSpace: "nowrap",
        width: "100%",
      }}
    >
      <div
        className="sectionTitle"
        style={{
          display: "inline-block",
          animation: `scrollTitle ${speed}s linear infinite`,
        }}
      >
        {repeatedText.map((item, index) => (
          <h2 key={index} style={{ display: "inline-block", marginRight: "2rem" }}>
            {item}
          </h2>
        ))}
      </div>
    </div>
  );
};

export default ScrollingTitle;