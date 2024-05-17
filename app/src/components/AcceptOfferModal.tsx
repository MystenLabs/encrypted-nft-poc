// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Box, Flex, Button } from "@radix-ui/themes";
import { useMarket } from "../web3hooks";
import { useSignAndExecuteTransactionBlock } from "@mysten/dapp-kit";
import { useEffect, useRef } from "react";

interface AcceptOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  pk: number[];
  id: string;
}

const AcceptOfferModal = ({
  isOpen,
  onClose,
  pk,
  id,
}: AcceptOfferModalProps) => {
  const { acceptOffer } = useMarket();
  const { mutate: signAndExecute } = useSignAndExecuteTransactionBlock();
  const modalRef = useRef<HTMLDivElement>(null);
  const handleOk = () => {
    const tx = acceptOffer(id, pk);
    signAndExecute(
      {
        transactionBlock: tx,
        requestType: "WaitForLocalExecution",
      },
      {
        onSuccess: () => {
          console.log("Success");
        },
        onError: (error) => {
          console.log(error);
        },
      },
    );
    onClose();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);
  return (
    <Flex
      className="modal-overlay"
      justify={"center"}
      align={"center"}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      }}
    >
      <Box
        ref={modalRef}
        className="modal"
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
        }}
      >
        <Box>
          <label>Buyer's pulic key</label>
          <p>{pk.toString()}</p>
        </Box>
        <Box>
          <label htmlFor="enc-master-key">Encrypted Master Key</label>
          <input
            id="enc-master-key"
            type="text"
            placeholder="Enter the Encrypted Master Key"
          />
        </Box>
        <Box>
          <Button onClick={handleOk} style={{ backgroundColor: "#F50032" }}>
            Accept Offer
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </Box>
      </Box>
    </Flex>
  );
};

export default AcceptOfferModal;
