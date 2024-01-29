
import { isValidSuiObjectId } from "@mysten/sui.js/utils";
import { Box, Container, Flex, Heading } from "@radix-ui/themes";
import { useState } from "react";
import Marketplace from "./components/Marketplace";
import TopBar from "./components/Topbar";


function App() {

  return (
    <>
      <TopBar />
      <Container>
        <Container
          mt="5"
          pt="2"
          px="4"
          style={{ background: "var(--gray-a2)", minHeight: 500 }}
        >
          <Marketplace />
        </Container>
      </Container>
    </>
  );
}

export default App;
