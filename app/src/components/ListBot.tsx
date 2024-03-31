import { Flex, Button, Heading, Box, TextArea } from "@radix-ui/themes";
import { useCallback, useState, useRef, useEffect } from "react";
import {
  useSignAndExecuteTransactionBlock,
  useCurrentAccount,
} from "@mysten/dapp-kit";
import { useMarket } from "../web3hooks";
import FileUpload from "./FileUpload";
import RightArrow from "../../assets/arrow_right.svg";

interface ListBotProps {
  step: number;
  goNext: () => void;
}

export const ListBot = ({ step, goNext }: ListBotProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [isBlurred, setIsBlurred] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [cipherURL, setCipherURL] = useState<string>("");
  const [secretKeyEphemeral, setSecretKeyEphemeral] = useState<string>("");
  const [secretKeyCiphertext, setSecretKeyCiphertext] = useState<string>("");
  const { createNFT } = useMarket();
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

  const backend = import.meta.env.VITE_BACKEND as string;
  const account = useCurrentAccount();

  const canvasRef = useRef(null);

  const onUpload = useCallback((files: File[]) => {
    if (files.length > 0 && files[0].type.includes("image")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string); // Set the image source to display it
      };
      reader.readAsDataURL(files[0]);
    }
  }, []);

  const onObfuscateClick = async () => {
    // setIsBlurred(!isBlurred);
    // const canvas: any = canvasRef.current;
    // const context = canvas.getContext("2d");
    const response = await fetch(backend + "obfuscate", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({
        image,
        seller: account?.address,
        imageName: name.replace(/ /g, "_"),
      }),
    });
    if (!response.ok) {
      console.warn(
        "Failed to obfuscate image with error:",
        response.statusText,
      );

    }
    const data = await response.json();
    setIsBlurred(true);
    setSecretKeyEphemeral(data.ephemeral);
    setSecretKeyCiphertext(data.ciphertext);
    setCipherURL(data.cipherUrl);
    setImage(data.obfuscatedImage);
    // img.src = data.obfuscatedImage;
  };

  

  useEffect(() => {
    if (canvasRef.current === null) {
      return;
    }
    const canvas: any = canvasRef.current;
    const context = canvas.getContext("2d");

    // Load and render the uploaded image on the canvas
    const img = new Image();
    img.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = image as string;
  }, [step, image]);
  
  const finish = async () => {
    const tx = createNFT(
      name,
      cipherURL.replace("_ciphertext", ""),
      cipherURL,
      secretKeyEphemeral,
      secretKeyCiphertext,
      account?.address as string,
    );

    signAndExecute(
      {
        transactionBlock: tx,
        options: {
          showEffects: true,
        },
        requestType: "WaitForLocalExecution",
      },
      {
        onSuccess: (_result) => {
          // go to marketplace
          goNext();
        },
        onError: (error) => {
          console.log(error);
        },
      },
    );
  };

  if (step === 1) {
    return (
      <Flex
        direction={"column"}
        align={"center"}
        justify={"center"}
        gap="6"
        style={{
          maxWidth: "1000px",
        }}
      >
        <FileUpload onUpload={onUpload} image={image} />
        <Button
          style={{
            marginLeft: "auto",
            backgroundColor: "#F50032",
            padding: "25px 60px",
          }}
          onClick={goNext}
        >
          Next <img src={RightArrow} />
        </Button>
      </Flex>
    );
  }
  if (step === 2) {
    return (
      <Flex direction={"column"} align={"end"}>
        <Flex direction={"row"}>
          <Flex direction={"column"} style={{ width: "100%", padding: "0px 10px" }}>
            <Heading size="5">Enter NFT Metadata</Heading>
            <Flex direction="column">
              <Flex
                direction={"column"}
                align={"stretch"}
                style={{ padding: "10px" }}
              >
                <label style={{ fontSize: "14px", fontFamily: "Inter" }}>
                  Title
                </label>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                  }}
                  type="text"
                  placeholder="Title"
                />
              </Flex>
              <Flex
                direction={"column"}
                align={"stretch"}
                style={{ padding: "10px" }}
              >
                <label style={{ fontSize: "14px", fontFamily: "Inter" }}>
                  Tags
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => {
                    setTags(e.target.value);
                  }}
                  placeholder="Enter Tags"
                />
                {/*suggestions */}
              </Flex>
              <Flex
                direction={"column"}
                align={"stretch"}
                style={{ padding: "10px" }}
              >
                <label style={{ fontSize: "14px", fontFamily: "Inter" }}>
                  Description
                </label>
                <TextArea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                  }}
                  placeholder="Enter a short description of your NFT."
                />
              </Flex>
            </Flex>
          </Flex>
          <Flex direction={"column"}>
            <Box style={{padding: "0px 32px"}}>
            <p>Protect your NFT</p>
            <Box>
              <Button
                disabled={name === "" ? true : false}
                onClick={onObfuscateClick}
              >
                Obfuscate
              </Button>
            </Box>
            </Box>
            <Box
              style={{
                padding: "32px",
                width: "560px",
                height: "575px",
                cursor: "crosshair",
              }}
            >
              <canvas ref={canvasRef} width={500} height={500}></canvas>
            </Box>
          </Flex>
        </Flex>
        <Button
          disabled={isBlurred ? false : true}
          style={{ backgroundColor: "#F50032" }}
          onClick={goNext}
        >
          Next <img src={RightArrow} />
        </Button>
      </Flex>
    );
  }
  if (step == 3) {
    return (
      <Flex
        direction={"column"}
        style={{ width: "50%", backgroundColor: "white" }}
      >
        <Box>
          <Heading size={"5"}> NFT Summary</Heading>
        </Box>
        <Flex direction={"row"} justify="start" gap="1">
          <Box>
            <img
              src={image!}
              style={{ width: "560px", height: "575px", padding: "20px" }}
            />
          </Box>
          <Flex direction={"column"}>
            <Box style={{ margin: "10px" }}>
              <label
                style={{
                  fontSize: "14px",
                  color: "black",
                  opacity: "0.5",
                  fontFamily: "Inter",
                  fontWeight: "600",
                }}
              >
                Title
              </label>
              <p
                style={{
                  color: "black",
                  fontWeight: 500,
                  fontFamily: "Inter",
                  fontSize: "18px",
                }}
              >
                {name}
              </p>
            </Box>
            <Box style={{ margin: "10px" }}>
              <label
                style={{
                  fontSize: "14px",
                  color: "black",
                  opacity: "0.5",
                  fontFamily: "Inter",
                  fontWeight: "600",
                }}
              >
                Tags
              </label>
              <p
                style={{
                  color: "black",
                  fontWeight: 500,
                  fontFamily: "Inter",
                  fontSize: "18px",
                }}
              >
                {tags.split(" ").map((tag) => (
                  <Button
                    style={{
                      height: "24px",
                      background: "#F5F5F7",
                      color: "black",
                      borderRadius: "24px",
                    }}
                  >
                    {tag.replace("#", "")}
                  </Button>
                ))}
              </p>
            </Box>
            <Box style={{ margin: "10px" }}>
              <label
                style={{
                  fontSize: "14px",
                  color: "black",
                  opacity: "0.5",
                  fontFamily: "Inter",
                  fontWeight: "600",
                }}
              >
                Description
              </label>
              <p
                style={{
                  color: "black",
                  fontWeight: 500,
                  fontFamily: "Inter",
                  fontSize: "18px",
                }}
              >
                {description}
              </p>
            </Box>
          </Flex>
        </Flex>
        <Button
          style={{ backgroundColor: "#F50032", width: "20%", marginLeft: "auto"}}
          onClick={finish}
        >
          Mint NFT <img src={RightArrow} />
        </Button>
      </Flex>
    );
  }
  return <></>;
};
