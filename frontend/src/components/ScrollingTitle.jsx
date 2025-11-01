import React, { useMemo, memo } from "react";
import "../styles/ScrollingTitle.css";

const ScrollingTitle = memo(({ text, repetitions = 2000, speed = 10000 }) => {
  // Create array of repeated text for seamless loop - memoize to prevent recreation on every render
  const repeatedText = useMemo(() => Array(repetitions).fill(text), [text, repetitions]);

  return (
    
    <div
      className="scroller"
      // style={{
      //   overflow: "hidden",
      //   whiteSpace: "nowrap",
      //   width: "100%",
      // }}
    >
      <hr className="hr1"/>
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
      <hr className="hr2"/>
    </div>
  );
});

ScrollingTitle.displayName = 'ScrollingTitle';

export default ScrollingTitle;