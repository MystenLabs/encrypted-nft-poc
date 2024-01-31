import { Box, Flex, Heading } from "@radix-ui/themes";
import { ConnectButton } from "@mysten/dapp-kit";
import logo from "../../assets/Logo.svg";

const WelcomePage = () => {
  return (
    <>
      <Flex
        style={{
          height: "100%",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        <Box style={{ textAlign: "justify", wordWrap: "break-word", width: "40%" }}>
          <Flex
            direction={"row"}
            justify={"start"}
            style={{ marginBottom: "50px", marginTop: "40px" }}
          >
            <img src={logo} alt="Mysten labs" id="logo"></img>
            <p id="text_top">Marketplace</p>
          </Flex>
          <Box>
            <Heading size="2">Buy or Sell Encrypted NFTs on Sui</Heading>
            <p>
              Your hub for buying and selling Encrypted NFT artworks. Join the
              community and explore the world of digital obfuscated art
              ownership unlike any other marketplaces.
            </p>
          </Box>
          <ConnectButton />
        </Box>
      </Flex>
    </>
  );
};

export default WelcomePage;
