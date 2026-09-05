import { AnimatedBackground } from "@okkly/react";

import { ChatProvider } from "./hooks/chat-context.js";
import { useViewportHeight } from "./hooks/useViewportHeight.js";
import { Sidebar } from "./components/sidebar/Sidebar.js";
import { ChatPanel } from "./components/chat/ChatPanel.js";
import { TopControls } from "./components/topbar/TopControls.js";
import styles from "./App.module.scss";

export function App() {
  useViewportHeight();

  return (
    <ChatProvider>
      <div className="app-shell">
        {/* Same ambient scene as the profile site — fixed behind the shell, so the
            transcript scrolls over a sky that keeps drifting. */}
        <AnimatedBackground
          // Two classes on purpose: the module class places the scene, the global one is
          // what the light theme retunes from `styles/app.scss` (same name the profile
          // app uses, so the two read alike).
          className={`app-shell__background ${styles.background}`}
          preset="aurora"
          quality="medium"
          scrim
        />
        <Sidebar className={styles.sidebar} />
        <main className={styles.main}>
          <TopControls />
          <ChatPanel />
        </main>
      </div>
    </ChatProvider>
  );
}
