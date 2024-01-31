import { Flex, Box } from "@radix-ui/themes";
interface NFTCardProps {
  className: string;
  image: string;
  name: string;
  price: string;
}
const NFTCard = ({ className, image, name, price }: NFTCardProps) => {
  return (
    <>
      <Flex
        direction={"column"}
        align-items={"flex-start"}
        align-self={"stretch"}
        className={className}
      >
        <img src={image} alt={name} />
        <Box>{name}</Box>
        <Box>Price: {price}</Box>
      </Flex>
    </>
  );
};

export default NFTCard;