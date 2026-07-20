import { createContext, useContext } from 'react'

// Holds the parsed EPG: Map<channelId(lowercased), programme[]> (or null).
export const EpgContext = createContext(null)
export const useEpg = () => useContext(EpgContext)
