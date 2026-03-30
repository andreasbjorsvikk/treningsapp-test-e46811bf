import { createRoot } from 'react-dom/client';
import App from "./App.tsx";
import "./index.css";
import { restoreActivityColors } from './utils/activityColors';
import { setupNativeAuthListener } from './utils/nativeAuth';

restoreActivityColors();
setupNativeAuthListener();

createRoot(document.getElementById("root")!).render(<App />);
