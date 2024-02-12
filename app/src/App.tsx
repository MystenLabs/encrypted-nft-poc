import { useCurrentAccount } from "@mysten/dapp-kit";
import { Box } from "@radix-ui/themes";
import Marketplace from "./pages/Marketplace";
import TopBar from "./components/Topbar";
import "./styles/global.css";
import WelcomePage from "./pages/WelcomePage";
import SellPage from "./pages/SellPage";
import { useState } from "react";

function App() {
  const [showSellPage, setShowSellPage] = useState(false);
  const currentAcc = useCurrentAccount();

  const finishSell = () => {
    setShowSellPage(false);
  }

  const startSell = () => {
    setShowSellPage(true);
  }

  if (currentAcc == null) {
    return (
      <>
        <WelcomePage />
      </>
    );
  }
  return (
    <>
      <TopBar onStartSell={startSell}/>
      <Box>
        <Box
          style={{ background: "var(--gray-a2)", minHeight: 500 }}
        >
          {showSellPage ? <SellPage onFinish={finishSell}/> : <Marketplace />}
        </Box>
      </Box>
    </>
  );
}

export default App;
