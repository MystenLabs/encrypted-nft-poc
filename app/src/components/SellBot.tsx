import { Flex, Button, Heading, Box, TextArea } from "@radix-ui/themes";
import { useCallback, useState, useRef, useEffect } from "react";
import { uploadImage, base64ToBlob } from "../utils/image_upload";
import { useSignAndExecuteTransactionBlock } from "@mysten/dapp-kit";
import { useMarket } from "../web3hooks";
import FileUpload from "./FileUpload";
import RightArrow from "../../assets/arrow_right.svg";

interface SellBotProps {
  step: number;
  goNext: () => void;
}
const SellBot = ({ step, goNext }: SellBotProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [isBlurred, setIsBlurred] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [price, setPrice] = useState<number>(1);
  const { list } = useMarket();
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();

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

  const onBlurClick = () => {
    // setIsBlurred(!isBlurred);
    const canvas: any = canvasRef.current;
    const context = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      context.filter = "blur(5px)"; // Apply blur filter to the canvas context
      context.drawImage(img, 0, 0, canvas.width, canvas.height); // Draw the blurred image onto the canvas
      setIsBlurred(true); // Update state to indicate that the image is blurred
      setImage(canvas.toDataURL()); // Update imageSrc with the blurred image data URL
    };

    img.src = image as string;
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
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = image as string;
  }, [step]);

  const finish = async () => {
    // upload image
    const blob = base64ToBlob(image as string);
    console.log("I get here ready to upload image.");
    const path = await uploadImage(
      new File([blob], name.replace("/ /g", "_"), { type: "image/png" }),
    );

    const tx = list(price.toString().concat("000000000"), path, name);
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
        align={"end"}
        justify={"center"}
        style={{ height: "100%", width: "100%", gap: "30px" }}
      >
        <FileUpload onUpload={onUpload} image={image} />
        <Button
          style={{
            backgroundColor: "#F50032",
            width: "150px",
            height: "50px",
            padding: "0 20px",
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
      <>
        <Flex direction={"row"}>
          <Flex direction={"column"} style={{ width: "100%" }}>
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
              <Flex
                direction={"column"}
                align={"stretch"}
                style={{ padding: "10px" }}
              >
                <label style={{ fontSize: "14px", fontFamily: "Inter" }}>
                  Price per copy
                </label>
                {/* free asset */}
                <Box>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => {
                      setPrice(Number(e.target.value));
                    }}
                    placeholder="1"
                  />
                  <span
                    style={{
                      left: "-40px",
                      position: "relative",
                      color: "#767A81",
                    }}
                  >
                    SUI
                  </span>
                </Box>
              </Flex>
            </Flex>
          </Flex>
          <Flex direction={"column"}>
            <p>Protect your NFT</p>
            <Box>
              <Button onClick={onBlurClick}>Blur</Button>
            </Box>
            <Box
              style={{
                padding: "32px",
                width: "560px",
                height: "575px",
                cursor: "crosshair",
              }}
            >
              <canvas
                ref={canvasRef}
                width={500}
                height={500}
                style={{ filter: isBlurred ? "blur(8px)" : "none" }}
              ></canvas>
            </Box>
          </Flex>
        </Flex>
        <Button style={{ backgroundColor: "#F50032" }} onClick={goNext}>
          Next <img src={RightArrow} />
        </Button>
      </>
    );
  }
  if (step == 3) {
    return (
      <Flex
        direction={"column"}
        align={"start"}
        style={{ width: "80%", backgroundColor: "white" }}
      >
        <Box>
          <Heading size={"5"}> NFT Summary</Heading>
        </Box>
        <Flex direction={"row"} justify={"between"}>
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
                      borderRadius: "24px"
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
                Price per copy
              </label>
              <p
                style={{
                  color: "black",
                  fontWeight: 500,
                  fontFamily: "Inter",
                  fontSize: "18px",
                }}
              >
                {price} SUI
              </p>
            </Box>
          </Flex>
        </Flex>
        <Button
          style={{ backgroundColor: "#F50032", width: "10%" }}
          onClick={finish}
        >
          List NFT <img src={RightArrow} />
        </Button>
      </Flex>
    );
  }
  return <></>;
};

export default SellBot;
