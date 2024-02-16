import { Box, Flex } from "@radix-ui/themes";

interface NFTTooltipProps {
  name: string;
  description: string;
  seller: string;
}

const NFTTooltip = ({ name, description, seller }: NFTTooltipProps) => {
  return (
    <Flex direction="column" className="tooltip">
      <Box>
        <h2>{name}</h2>
      </Box>
      <Box>
        <p>Seller: {seller}</p>
      </Box>
      <Box>
        <p>{description}</p>
      </Box>
    </Flex>
  );
};

export default NFTTooltip;
