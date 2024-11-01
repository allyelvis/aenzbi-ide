import { MonacoEditor } from "@monaco-editor/react";
import React from 'react';

const CodeEditor = () => {
  return (
    <MonacoEditor height="90vh" language="javascript" />
  );
};

export default CodeEditor;
