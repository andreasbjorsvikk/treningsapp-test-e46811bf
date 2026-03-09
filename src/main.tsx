import { createRoot } from 'react-dom/client';
import App from "./App.tsx";
import "./index.css";
import { restoreActivityColors } from './utils/activityColors';

restoreActivityColors();

createRoot(document.getElementById("root")!).render(<App />);
