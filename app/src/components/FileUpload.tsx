/* step 1 of sell NFT process */
import { useDropzone } from "react-dropzone";
import { Box, Flex, Heading, Button } from "@radix-ui/themes";
import Icon from "../../assets/upload.svg";

interface FileUploadProps {
  onUpload: (file: File[]) => void;
  image: string | null;
}
const FileUpload = ({ onUpload, image }: FileUploadProps) => {

  const { getRootProps, getInputProps, isDragAccept, isFocused, isDragReject } =
    useDropzone({
      accept: {"image/*": [".webp", ".jpg", ".png", ".svg", ".gif"]},
      onDrop: onUpload,
      noClick: false,
      noKeyboard: true,
      multiple: false,
      maxSize: 60000000,
    });

  return (
    <>
      <Box style={{ backgroundColor: "white" }}>
        <Heading size={"5"}>Upload Files</Heading>
        <p>
          Please take into consideration that the image file size impacts the
          minting fee.
        </p>
      </Box>
      <Flex
        justify={"between"}
        direction={"column"}
        {...getRootProps({ className: "dropzone" })}
        style={{
          border: "2px dashed #EAECEF",
          height: "200px",
          margin: "32px",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
        <input {...getInputProps()} />
        { image == null ? 
        <>
        <p>Drag 'n' drop some files here, or click to select files</p>
        <Button>
          Browse Files <img src={Icon} />
        </Button>
        <p>Max 60 MB WEBP, JPG, PNG, SVG, and GIF</p>
        </> :
        <img src={image} style={{maxWidth: "100%", maxHeight: "100%"}}/>
        }
      </Flex>
    </>
  );
};

export default FileUpload;
