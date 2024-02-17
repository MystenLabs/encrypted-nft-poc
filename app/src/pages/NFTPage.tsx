import { Button, Flex, Link } from "@radix-ui/themes";

interface NFTPageProps {
  id: string;
  name: string;
  image: string;
  price: string;
  seller: string;
  pk: number[];
  isOffer: boolean;
}

const NFTPage = ({ id, name, image, price, seller, pk }: NFTPageProps) => {
  return (
    <Flex direction="column">
      <Flex direction="row">
        <Button>Back</Button>
        <h2>Asset Preview</h2>
      </Flex>
      <Flex direction="row">
        <img src={image} alt={name} />
        <Flex direction="column">
          <h3>{name}</h3>
          <h3>{price}</h3>
          <h3>{seller}</h3>
          <Link
            href={`https://suiexplorer.com/object/${id}?network=${import.meta.env.VITE_ACTIVE_NETWORK}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Explorer
          </Link>
          <Button>Buy</Button>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default NFTPage;
