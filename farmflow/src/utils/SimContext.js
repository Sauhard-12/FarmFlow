import React, { createContext, useContext, useState } from 'react';

const SimContext = createContext(null);

export function SimProvider({ children }) {
  const [simData, setSimData] = useState(null);
  const [formData, setFormData] = useState(null);
  return (
    <SimContext.Provider value={{ simData, setSimData, formData, setFormData }}>
      {children}
    </SimContext.Provider>
  );
}

export const useSim = () => useContext(SimContext);
