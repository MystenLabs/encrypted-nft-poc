/* step 1 of sell NFT process */
import { useDropzone } from "react-dropzone";
import { Box, Flex, Heading, Button } from "@radix-ui/themes";
import Icon from "../../assets/upload.svg";

interface FileUploadProps {
  onUpload: (file: File[]) => void;
  image: string | null;
}
const FileUpload = ({ onUpload, image }: FileUploadProps) => {
  const { getRootProps, getInputProps } =
    useDropzone({
      accept: { "image/*": [".webp", ".jpg", ".png", ".svg", ".gif"] },
      onDrop: onUpload,
      noClick: false,
      noKeyboard: true,
      multiple: false,
      maxSize: 60000000,
    });

  return (
    <Flex
      justify={"center"}
      direction={"column"}
      align={"center"}
      style={{
        height: "auto",
        width:"100%",
        alignItems: "start",
        backgroundColor: "#FFFFFF",
        padding: "20px",
      }}
    >
      <Box>
        <Heading size={"5"}>Upload Files</Heading>
        <p style={{ fontSize: "14px", color: "#767A81" }}>
          Please take into consideration that the image file size impacts the
          minting fee.
        </p>
      </Box>
      <Flex
        direction={"column"}
        {...getRootProps({ className: "dropzone" })}
        style={{
          border: "2px dashed #EAECEF",
          height: "200px",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <input {...getInputProps()} />
        <p style={{ color: "#767A81", marginBottom: "3px" }}>
          Drag 'n' drop files or
        </p>
        <Button
          style={{
            borderRadius: "24px",
            backgroundColor: "#F3F6F8",
            color: "#767A81",
            cursor: "pointer",
          }}
        >
          Browse Files <img src={Icon} />
        </Button>
        <p style={{ color: "#767A81", marginTop: "30px", fontSize: "12px" }}>
          Max 60 MB WEBP, JPG, PNG, SVG, and GIF
        </p>
      </Flex>
      {image != null && (
        <Flex
          direction={"row"}
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            height: "200px",
            backgroundColor: "white",
            width: "100%",
            paddingTop: "20px",
          }}
        >
          <img src={image} style={{ width: "200px", height: "200px" }} />
          <Box>
            <Button
              style={{
                backgroundColor: "white",
                borderRadius: "33px",
                color: "black",
                border: "1px solid #E1E4E8",
                width: "150px",
                height: "40px",
              }}
            >
              {" "}
              Replace <img src={Icon} />
            </Button>
            <Button
              style={{
                margin: "0 20px",
                backgroundColor: "white",
                borderRadius: "33px",
                color: "#898D93",
                border: "1px solid #E1E4E8",
                width: "40px",
                height: "40px",}}
            >
              {" "}
              X{" "}
            </Button>
          </Box>
        </Flex>
      )}
    </Flex>
  );
};

export default FileUpload;
