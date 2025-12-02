import { Suspense, useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./components/home";
import LoginPage from "./components/LoginPage";
import { useAuthStore } from "./store/authStore";

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    setShowApp(isAuthenticated);
  }, [isAuthenticated]);

  if (!showApp) {
    return <LoginPage onLoginSuccess={() => setShowApp(true)} />;
  }

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </>
    </Suspense>
  );
}

export default App;
