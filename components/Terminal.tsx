import { Terminal } from "xterm";
import React, { useEffect } from 'react';

const TerminalComponent = () => {
  useEffect(() => {
    const terminal = new Terminal();
    terminal.open(document.getElementById("terminal"));
  }, []);

  return <div id="terminal" style={{ height: "200px" }}></div>;
};

export default TerminalComponent;
