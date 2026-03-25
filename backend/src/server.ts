import express from "express";
import { transformRouter } from "./routes/transform.js";

const app = express();

app.use(express.json());
app.use("/api/transform", transformRouter);

if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
  });
}

export { app };
