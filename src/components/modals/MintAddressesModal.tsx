/* eslint-disable react/no-unescaped-entities */
import React, { useState } from "react";
import { checkAddress } from "@/lib/address";
import { menuItems } from "@/data/footerLinks";

export interface MintAddress {
  amount: number | "";
  address: string;
}

const testData: MintAddress[] = [
  {
    amount: 1,
    address: "B62qiq7iTTP7Z2KEpQ9eF9UVGLiEKAjBpz1yxyd2MwMrxVwpAMLta2h",
  },
  {
    amount: 2,
    address: "B62qiq7iTTP7Z2KEpQ9eF9UVGLiEKAjBpz1yxyd2MwMrxVwpAMLta2h",
  },
  {
    amount: 3,
    address: "B62qiq7iTTP7Z2KEpQ9eF9UVGLiEKAjBpz1yxyd2MwMrxVwpAMLta2h",
  },
  {
    amount: 4,
    address: "B62qiq7iTTP7Z2KEpQ9eF9UVGLiEKAjBpz1yxyd2MwMrxVwpAMLta2h",
  },
  {
    amount: 5,
    address: "B62qiq7iTTP7Z2KEpQ9eF9UVGLiEKAjBpz1yxyd2MwMrxVwpAMLta2h",
  },
  {
    amount: 6,
    address: "B62qiq7iTTP7Z2KEpQ9eF9UVGLiEKAjBpz1yxyd2MwMrxVwpAMLta2h",
  },
];

export function MintAddressesModal({
  onSubmit,
}: {
  onSubmit: (mintAddresses: MintAddress[]) => void;
}) {
  const [mintAddresses, setMintAddresses] = useState<MintAddress[]>(testData);

  async function onChangeAddress(
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    setMintAddresses((items) => {
      const newMintAddresses = [...items];
      newMintAddresses[index].address = e.target.value;
      return newMintAddresses;
    });
    const isValid =
      e.target.value.length === 0 ? true : await checkAddress(e.target.value);
    if (isValid) {
      e.target.style.border = "";
    } else {
      e.target.style.border = "2px solid red";
    }
  }

  const handleSubmit = () => {
    onSubmit(testData);
  };

  return (
    <div
      className="modal fade"
      id="MintAddressesModal"
      tabIndex={-1}
      aria-labelledby="addMintAddressesLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog max-w-3xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title text-sm" id="addPropertiesLabel">
              Mint addresses
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                className="h-6 w-6 fill-jacarta-700 dark:fill-white"
              >
                <path fill="none" d="M0 0h24v24H0z" />
                <path d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z" />
              </svg>
            </button>
          </div>

          <div className="modal-body p-6">
            <div className="relative my-3 flex items-center" key="title-mint">
              <div className="w-1/4 flex justify-center">
                <label className="mb-3 text-sm block font-display text-base font-semibold text-jacarta-700 dark:text-white text-center">
                  Amount
                </label>
              </div>

              <div className="w-3/4 flex justify-center">
                <label className="mb-3 text-sm block font-display text-base font-semibold text-jacarta-700 dark:text-white text-center">
                  Address
                </label>
              </div>
            </div>
            {mintAddresses.map((mintAddress, index) => (
              <div className="relative  flex items-center" key={index}>
                <button
                  onClick={() =>
                    setMintAddresses((items) => {
                      const newMintAddresses = [...items];
                      newMintAddresses.splice(index, 1);
                      return newMintAddresses;
                    })
                  }
                  className="flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-l-lg border border-r-0 border-jacarta-100 bg-jacarta-50 hover:bg-jacarta-100 dark:border-jacarta-600 dark:bg-jacarta-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    className="h-6 w-6 fill-jacarta-500 dark:fill-jacarta-300"
                  >
                    <path fill="none" d="M0 0h24v24H0z"></path>
                    <path d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z"></path>
                  </svg>
                </button>

                <div className="w-1/5">
                  <input
                    type="number"
                    className="h-12 w-full border border-r-0 border-jacarta-100 text-sm focus:ring-inset focus:ring-accent dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white dark:placeholder-jacarta-300"
                    placeholder="amount"
                    value={mintAddress.amount}
                    onChange={(e) => {
                      setMintAddresses((items) => {
                        const newMintAddresses = [...items];
                        newMintAddresses[index].amount = parseFloat(
                          e.target.value
                        );
                        return newMintAddresses;
                      });
                    }}
                  />
                </div>

                <div className="w-4/5">
                  <input
                    type="text"
                    className="h-12 w-full rounded-r-lg border border-jacarta-100 text-sm focus:ring-inset focus:ring-accent dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white dark:placeholder-jacarta-300"
                    placeholder="address (B62...)"
                    value={mintAddress.address}
                    onChange={(e) => onChangeAddress(index, e)}
                  />
                </div>
              </div>
            ))}

            <button
              onClick={() =>
                setMintAddresses((items) => [
                  ...items,
                  { amount: "", address: "" },
                ])
              }
              className="mt-2 rounded-full border-2 border-accent py-2 px-8 text-center text-sm font-semibold text-accent transition-all hover:bg-accent hover:text-white"
            >
              Add More
            </button>
          </div>

          <div className="modal-footer">
            <div className="flex items-center justify-center space-x-4">
              <button
                type="button"
                data-bs-dismiss="modal"
                className="rounded-full bg-accent py-3 px-8 text-center font-semibold text-white shadow-accent-volume transition-all hover:bg-accent-dark"
                onClick={handleSubmit}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
