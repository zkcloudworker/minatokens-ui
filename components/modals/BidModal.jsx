/* eslint-disable react/no-unescaped-entities */
export default function BidModal() {
  return (
    <div>
      <div
        className="modal fade"
        id="placeBidModal"
        tabIndex="-1"
        aria-labelledby="placeBidLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog max-w-2xl">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="placeBidLabel">
                Place a bid
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

            {/* Body */}
            <div className="modal-body p-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display text-sm font-semibold text-jacarta-700 dark:text-white">
                  Price
                </span>
              </div>

              <div className="relative mb-2 flex items-center overflow-hidden rounded-lg border border-jacarta-100 dark:border-jacarta-600">
                <div className="flex flex-1 items-center self-stretch border-r border-jacarta-100 bg-jacarta-50 px-2">
                  <span>
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      x="0"
                      y="0"
                      viewBox="0 0 1920 1920"
                      // xml:space="preserve"
                      className="mr-1 h-5 w-5"
                    >
                      <path
                        fill="#8A92B2"
                        d="M959.8 80.7L420.1 976.3 959.8 731z"
                      ></path>
                      <path
                        fill="#62688F"
                        d="M959.8 731L420.1 976.3l539.7 319.1zm539.8 245.3L959.8 80.7V731z"
                      ></path>
                      <path
                        fill="#454A75"
                        d="M959.8 1295.4l539.8-319.1L959.8 731z"
                      ></path>
                      <path
                        fill="#8A92B2"
                        d="M420.1 1078.7l539.7 760.6v-441.7z"
                      ></path>
                      <path
                        fill="#62688F"
                        d="M959.8 1397.6v441.7l540.1-760.6z"
                      ></path>
                    </svg>
                  </span>
                  <span className="font-display text-sm text-jacarta-700">
                    ETH
                  </span>
                </div>

                <input
                  type="text"
                  className="h-12 w-full flex-[3] border-0 focus:ring-inset focus:ring-accent"
                  placeholder="Amount"
                  defaultValue="0.05"
                />

                <div className="flex flex-1 justify-end self-stretch border-l border-jacarta-100 bg-jacarta-50">
                  <span className="self-center px-2 text-sm">$130.82</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm dark:text-jacarta-400">
                  Balance: 0.0000 WETH
                </span>
              </div>

              {/* Terms */}
              <div className="mt-4 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="terms"
                  className="h-5 w-5 self-start rounded border-jacarta-200 text-accent checked:bg-accent focus:ring-accent/20 focus:ring-offset-0 dark:border-jacarta-500 dark:bg-jacarta-600"
                />
                <label
                  htmlFor="terms"
                  className="text-sm dark:text-jacarta-200"
                >
                  By checking this box, I agree to Xhibiter's{" "}
                  <a href="#" className="text-accent">
                    Terms of Service
                  </a>
                </label>
              </div>
            </div>
            {/* end body */}

            <div className="modal-footer">
              <div className="flex items-center justify-center space-x-4">
                <button
                  type="button"
                  className="rounded-full bg-accent py-3 px-8 text-center font-semibold text-white shadow-accent-volume transition-all hover:bg-accent-dark"
                >
                  Place Bid
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
