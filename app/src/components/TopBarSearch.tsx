import { TextField } from "@radix-ui/themes";
import SearchIcon from "../../assets/search.svg";

const TopBarSearch = () => {
    return (
    <>
    <TextField.Root radius="full">
        <TextField.Slot>
            <img src={SearchIcon}/>
        </TextField.Slot>
        <TextField.Input placeholder="Search NFTs"/>
    </TextField.Root>
    </>
    );
}

export default TopBarSearch;