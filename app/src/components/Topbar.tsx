import { ConnectButton } from "@mysten/dapp-kit";
import { Box, Container, Flex, Heading } from "@radix-ui/themes";
import TopBarSearch from "./TopBarSearch";
import TopButton from "./TopButton";
import logo from "../../assets/Logo.svg";
import "../styles/topbar.css";

interface TopBarProps { 
  onStart: () => void;
}

export const TopBar = ({onStart}: TopBarProps) => {
  return (
    <>
      <Flex
        shrink="0"
        justify="between"
        align="center"
        style={{
          height: "85px",
          alignSelf: "stretch",
          alignItems: "center",
          borderBottom: "1px solid #EAECEF",
        }}
      >
        <Flex direction="row" justify="start">
          <img
            src={logo}
            alt="Mysten labs"
            id="logo"
            className="top-element"
          ></img>
        </Flex>
        <Box>
            <TopBarSearch />
        </Box>
        <Box>
            <TopButton onStart={onStart} />
        </Box>
        <Box>
          <ConnectButton id="connect_button"/>
        </Box>
      </Flex>
    </>
  );
};
