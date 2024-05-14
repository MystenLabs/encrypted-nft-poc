import { useCurrentAccount } from "@mysten/dapp-kit";
import { Box } from "@radix-ui/themes";
import { PersonalSpace } from "./pages/PersonalSpace";
import { TopBar } from "./components/Topbar";
import "./styles/global.css";
import WelcomePage from "./pages/WelcomePage";
import { ListPage } from "./pages/ListPage";
import { useState } from "react";

function App() {
  const [showListPage, setShowListPage] = useState(false);
  const currentAcc = useCurrentAccount();

  const finishListing = () => {
    setShowListPage(false);
  };

  const startListing = () => {
    setShowListPage(true);
  };

  if (currentAcc == null) {
    return (
      <>
        <WelcomePage />
      </>
    );
  }
  return (
    <Box style={{ width: "100%", height: "100%" }}>
      <TopBar onStart={startListing} />
      <Box style={{ background: "var(--gray-a2)", height: "100%" }}>
        {showListPage ? (
          <ListPage onFinish={finishListing} />
        ) : (
          <PersonalSpace />
        )}
      </Box>
    </Box>
  );
}

export default App;
