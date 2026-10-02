import { createRoot } from "react-dom/client";
import Fahtzee from "./src/App.jsx";
import Splash from "./src/Splash.jsx";
import Milestone from "./src/Milestone.jsx";
import FahtzeeScene from "./src/FahtzeeScene.jsx";
createRoot(document.getElementById("root")).render(
  <>
    <Fahtzee />
    <FahtzeeScene />
    <Milestone />
    <Splash />
  </>
);
