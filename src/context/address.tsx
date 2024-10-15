import React, { createContext, useState } from "react";

interface AddressProviderProps {
  children: React.ReactNode;
}

interface AddressContextType {
  address: string | undefined;
  setAddress: React.Dispatch<React.SetStateAction<string | undefined>>;
}

export const AddressContext = createContext<AddressContextType>({
  address: undefined,
  setAddress: () => {},
});

export const AddressProvider: React.FC<AddressProviderProps> = ({
  children,
}) => {
  const [address, setAddress] = useState<string | undefined>(undefined);

  return (
    <AddressContext.Provider value={{ address, setAddress }}>
      {children}
    </AddressContext.Provider>
  );
};
