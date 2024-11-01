import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const { action, fileName, content } = req.body;
  const filePath = path.join(process.cwd(), "files", fileName);

  switch (action) {
    case "read":
      fs.readFile(filePath, "utf-8", (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ content: data });
      });
      break;
    case "write":
      fs.writeFile(filePath, content, "utf-8", (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: "File saved!" });
      });
      break;
    default:
      res.status(400).json({ error: "Invalid action" });
  }
}
