import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/compliance", routes);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
