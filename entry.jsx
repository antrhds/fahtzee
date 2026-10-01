import { createRoot } from "react-dom/client";
import Fahtzee from "./src/App.jsx";
import Splash from "./src/Splash.jsx";
createRoot(document.getElementById("root")).render(
  <>
    <Fahtzee />
    <Splash />
  </>
);
