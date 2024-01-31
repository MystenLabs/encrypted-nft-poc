import { useCurrentAccount } from "@mysten/dapp-kit";
import { Box } from "@radix-ui/themes";
import Marketplace from "./components/Marketplace";
import TopBar from "./components/Topbar";
import "./styles/global.css";
import WelcomePage from "./components/WelcomePage";

function App() {
  const currentAcc = useCurrentAccount();
  if (currentAcc == null) {
    return (
      <>
        <WelcomePage />
      </>
    );
  }
  return (
    <>
      <TopBar />
      <Box>
        <Box
          mt="5"
          pt="2"
          px="4"
          style={{ background: "var(--gray-a2)", minHeight: 500 }}
        >
          <Marketplace />
        </Box>
      </Box>
    </>
  );
}

export default App;
